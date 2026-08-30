import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../app.js';
import { initializeSqlite, closeSqlite, getUploadDir } from '../../backend/database/sqlite-setup.js';

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
});
