import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../app.js';
import { initializeSqlite, closeSqlite, getUploadDir } from '../../backend/database/sqlite-setup.js';
import { performCleanupRound } from '../services/cleanupService.js';

const fixturesDir = path.join(getUploadDir(), 'fixtures-download-concurrency');

describe('Atomic download reservation', () => {
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

  it('allows only one of two simultaneous downloads when maxDownloads is 1', async () => {
    const filePath = path.join(fixturesDir, 'one-shot.txt');
    fs.writeFileSync(filePath, 'single-slot payload');

    const uploadRes = await request(app)
      .post('/api/upload')
      .field('expiryMinutes', '60')
      .field('maxDownloads', '1')
      .attach('file', filePath, { filename: 'one-shot.txt', contentType: 'text/plain' });

    expect(uploadRes.status).toBe(201);
    const fileId = uploadRes.body.fileId as string;

    const [first, second] = await Promise.all([
      request(app).get(`/api/download/${fileId}`),
      request(app).get(`/api/download/${fileId}`),
    ]);

    const statuses = [first.status, second.status].sort();
    expect(statuses).toEqual([200, 410]);

    const winner = first.status === 200 ? first : second;
    expect(winner.text).toContain('single-slot payload');

    const loser = first.status === 410 ? first : second;
    expect(loser.body.success).toBe(false);
  });

  it('returns 410 and removes the record when the stored file is already gone', async () => {
    const filePath = path.join(fixturesDir, 'already-gone.txt');
    fs.writeFileSync(filePath, 'will be deleted from disk');

    const uploadRes = await request(app)
      .post('/api/upload')
      .field('expiryMinutes', '60')
      .field('maxDownloads', '3')
      .attach('file', filePath, { filename: 'already-gone.txt', contentType: 'text/plain' });

    expect(uploadRes.status).toBe(201);
    const fileId = uploadRes.body.fileId as string;
    const db = initializeSqlite();
    const row = db.prepare('SELECT file_path FROM files WHERE id = ?').get(fileId) as { file_path: string };
    fs.unlinkSync(row.file_path);

    const res = await request(app).get(`/api/download/${fileId}`);
    expect(res.status).toBe(410);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body.success).toBe(false);
    expect(db.prepare('SELECT id FROM files WHERE id = ?').get(fileId)).toBeUndefined();
  });

  it('completes a download when cleanup runs at the same time', async () => {
    const filePath = path.join(fixturesDir, 'cleanup-race.txt');
    fs.writeFileSync(filePath, 'cleanup-race payload');

    const uploadRes = await request(app)
      .post('/api/upload')
      .field('expiryMinutes', '60')
      .field('maxDownloads', '1')
      .attach('file', filePath, { filename: 'cleanup-race.txt', contentType: 'text/plain' });

    expect(uploadRes.status).toBe(201);
    const fileId = uploadRes.body.fileId as string;

    const [downloadRes] = await Promise.all([
      request(app).get(`/api/download/${fileId}`),
      Promise.resolve().then(() => performCleanupRound()),
    ]);

    expect(downloadRes.status).toBe(200);
    expect(downloadRes.text).toContain('cleanup-race payload');
  });
});
