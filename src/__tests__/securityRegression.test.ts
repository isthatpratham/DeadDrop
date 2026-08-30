import { describe, expect, it, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../app.js';
import { initializeSqlite, closeSqlite, getUploadDir } from '../../backend/database/sqlite-setup.js';

const fixturesDir = path.join(getUploadDir(), 'fixtures-security-regression');

describe('Security regression suite', () => {
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

  it('rejects path-traversal download IDs with JSON 404 and no filesystem leak', async () => {
    const res = await request(app).get('/api/download/..%2F..%2F..%2Fetc%2Fpasswd');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.success).toBe(false);
    expect(['File not found', 'Not found']).toContain(res.body.message);
    expect(res.text).not.toMatch(/root:|etc\/passwd|\\\\windows/i);
  });

  it('rejects non-UUID file info IDs', async () => {
    const res = await request(app).get('/api/file/not-a-uuid/info');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body)).not.toMatch(/SQLITE|file_path|uploads/i);
  });

  it('ignores download passwords supplied on the query string', async () => {
    const filePath = path.join(fixturesDir, 'secret.txt');
    fs.writeFileSync(filePath, 'classified');

    const upload = await request(app)
      .post('/api/upload')
      .field('expiryMinutes', '60')
      .field('password', 'correct-horse')
      .attach('file', filePath, { filename: 'secret.txt', contentType: 'text/plain' });

    expect(upload.status).toBe(201);
    const fileId = upload.body.fileId as string;

    const viaQuery = await request(app).get(`/api/download/${fileId}?password=correct-horse`);
    expect(viaQuery.status).toBe(403);
    expect(viaQuery.body.message).toBe('Password required');
    expect(JSON.stringify(viaQuery.body)).not.toContain('correct-horse');
  });

  it('sanitizes Content-Disposition so filenames cannot inject headers', async () => {
    const filePath = path.join(fixturesDir, 'named.txt');
    fs.writeFileSync(filePath, 'named payload');

    const upload = await request(app)
      .post('/api/upload')
      .field('expiryMinutes', '60')
      .attach('file', filePath, {
        filename: 'evil\r\nSet-Cookie: session=stolen.txt',
        contentType: 'text/plain',
      });

    expect(upload.status).toBe(201);
    const download = await request(app).get(`/api/download/${upload.body.fileId}`);

    expect(download.status).toBe(200);
    const disposition = download.headers['content-disposition'] ?? '';
    expect(disposition).not.toMatch(/[\r\n]/);
    expect(disposition.toLowerCase().startsWith('attachment;')).toBe(true);
    expect(download.headers['set-cookie']).toBeUndefined();
  });

  it('does not allow an unlisted CORS origin', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('sets security headers on API responses', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['content-security-policy']).toMatch(/default-src 'self'/);
  });

  it('replaces an injected request id instead of echoing it', async () => {
    const res = await request(app).get('/api/health').set('X-Request-Id', '{"injected":true}');
    expect(res.headers['x-request-id']).not.toContain('{');
    expect(res.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/i);
  });
});
