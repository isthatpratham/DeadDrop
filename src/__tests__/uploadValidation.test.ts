import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../app.js';
import { initializeSqlite, closeSqlite, getSqliteDb, getUploadDir } from '../../backend/database/sqlite-setup.js';
import { parseExpiryMinutes, parseMaxDownloads } from '../utils/uploadConstraints.js';

const fixturesDir = path.join(getUploadDir(), 'fixtures-upload-validation');

const writeTextFixture = (name: string, contents: string): string => {
  const filePath = path.join(fixturesDir, name);
  fs.writeFileSync(filePath, contents);
  return filePath;
};

describe('parseExpiryMinutes and parseMaxDownloads', () => {
  it('accepts the UI expiry values and rejects invalid expiry input', () => {
    expect(parseExpiryMinutes('60')).toEqual({ ok: true, value: 60 });
    expect(parseExpiryMinutes('1440')).toEqual({ ok: true, value: 1440 });
    expect(parseExpiryMinutes('10080')).toEqual({ ok: true, value: 10080 });
    expect(parseExpiryMinutes('abc').ok).toBe(false);
    expect(parseExpiryMinutes('0').ok).toBe(false);
    expect(parseExpiryMinutes('-5').ok).toBe(false);
    expect(parseExpiryMinutes('10081').ok).toBe(false);
    expect(parseExpiryMinutes('1.5').ok).toBe(false);
  });

  it('defaults maxDownloads to 1 and rejects out-of-range values', () => {
    expect(parseMaxDownloads(undefined)).toEqual({ ok: true, value: 1 });
    expect(parseMaxDownloads('')).toEqual({ ok: true, value: 1 });
    expect(parseMaxDownloads('3')).toEqual({ ok: true, value: 3 });
    expect(parseMaxDownloads('0').ok).toBe(false);
    expect(parseMaxDownloads('-1').ok).toBe(false);
    expect(parseMaxDownloads('101').ok).toBe(false);
    expect(parseMaxDownloads('2.5').ok).toBe(false);
    expect(parseMaxDownloads('NaN').ok).toBe(false);
  });
});

describe('Upload validation API', () => {
  beforeAll(() => {
    fs.mkdirSync(fixturesDir, { recursive: true });
    initializeSqlite();
  });

  afterAll(() => {
    try {
      closeSqlite();
    } catch {
      // Ignore
    }
  });

  it('rejects invalid expiry and does not leave an uploaded file behind', async () => {
    const before = new Set(fs.readdirSync(getUploadDir()));
    const filePath = writeTextFixture('bad_expiry.txt', 'orphan probe');

    const res = await request(app)
      .post('/api/upload')
      .field('expiryMinutes', '0')
      .attach('file', filePath, { filename: 'bad_expiry.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid expiry time');
    expect(res.headers['content-type']).toMatch(/json/);

    const after = fs.readdirSync(getUploadDir()).filter((name) => !before.has(name) && !name.startsWith('fixtures-'));
    expect(after).toEqual([]);
  });

  it('rejects invalid maxDownloads values', async () => {
    const filePath = writeTextFixture('bad_max.txt', 'max downloads probe');

    const res = await request(app)
      .post('/api/upload')
      .field('expiryMinutes', '60')
      .field('maxDownloads', '101')
      .attach('file', filePath, { filename: 'bad_max.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid max downloads');
  });

  it('rejects empty files', async () => {
    const filePath = writeTextFixture('empty.txt', '');

    const res = await request(app)
      .post('/api/upload')
      .field('expiryMinutes', '60')
      .attach('file', filePath, { filename: 'empty.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Empty files');
  });

  it('stores a safe MIME extension instead of a spoofed client filename', async () => {
    const jpegPath = path.join(fixturesDir, 'shell.php');
    fs.writeFileSync(jpegPath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]));

    const res = await request(app)
      .post('/api/upload')
      .field('expiryMinutes', '60')
      .attach('file', jpegPath, { filename: 'shell.php', contentType: 'image/jpeg' });

    expect(res.status).toBe(201);
    const row = getSqliteDb().prepare('SELECT stored_name FROM files WHERE id = ?').get(res.body.fileId) as { stored_name: string };
    expect(row.stored_name.endsWith('.jpg')).toBe(true);
    expect(row.stored_name.endsWith('.php')).toBe(false);
  });

  it('rejects oversized uploads with a JSON 400', async () => {
    const oversizedPath = path.join(fixturesDir, 'too-big.txt');
    fs.writeFileSync(oversizedPath, Buffer.alloc(11 * 1024 * 1024, 0x61));

    const res = await request(app)
      .post('/api/upload')
      .field('expiryMinutes', '60')
      .attach('file', oversizedPath, { filename: 'too-big.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('File exceeds the 10MB limit');
  });

  it('rejects invalid MIME types with a JSON 400', async () => {
    const exePath = writeTextFixture('malware.exe', 'not an allowed type');

    const res = await request(app)
      .post('/api/upload')
      .field('expiryMinutes', '60')
      .attach('file', exePath, { filename: 'malware.exe', contentType: 'application/x-msdownload' });

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Invalid file type');
  });
});
