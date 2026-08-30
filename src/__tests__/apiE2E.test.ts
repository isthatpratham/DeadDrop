import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import app from '../app.js';
import { initializeSqlite, closeSqlite, getUploadDir } from '../../backend/database/sqlite-setup.js';
import { performCleanupRound } from '../services/cleanupService.js';

const tmpTestDir = path.join(getUploadDir(), 'fixtures-e2e');
const uploadDir = getUploadDir();

describe('Comprehensive E2E API Integration Test Suite', () => {
  beforeAll(() => {
    fs.mkdirSync(tmpTestDir, { recursive: true });
    fs.mkdirSync(uploadDir, { recursive: true });
    initializeSqlite();
  });

  afterAll(() => {
    try {
      closeSqlite();
    } catch {
      // Ignore
    }
    if (fs.existsSync(tmpTestDir)) {
      try {
        fs.rmSync(tmpTestDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
      } catch {
        // Ignore
      }
    }
  });

  it('1. should upload a valid PDF file successfully', async () => {
    const pdfPath = path.join(tmpTestDir, 'test_sample.pdf');
    fs.writeFileSync(pdfPath, '%PDF-1.5 Sample test content for DeadDrop');

    const res = await request(app)
      .post('/api/upload')
      .field('expiryMinutes', '60')
      .field('maxDownloads', '2')
      .attach('file', pdfPath, { filename: 'test_sample.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.fileId).toBeDefined();
    expect(res.body.downloadLink).toContain('/api/download/');
  });

  it('2. should reject upload request when no file is attached', async () => {
    const res = await request(app)
      .post('/api/upload')
      .field('expiryMinutes', '60');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('No file uploaded');
  });

  it('3. should reject MIME spoofing attack (PHP script disguised as PNG)', async () => {
    const phpPath = path.join(tmpTestDir, 'fake_image.png');
    fs.writeFileSync(phpPath, '<?php system($_GET["cmd"]); ?>');

    const res = await request(app)
      .post('/api/upload')
      .field('expiryMinutes', '60')
      .attach('file', phpPath, { filename: 'fake_image.png', contentType: 'image/png' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBeDefined();
  });

  it('4. should handle password-protected file upload and require password on download', async () => {
    const textPath = path.join(tmpTestDir, 'secret_doc.txt');
    fs.writeFileSync(textPath, 'Confidential Information 123');

    const uploadRes = await request(app)
      .post('/api/upload')
      .field('expiryMinutes', '60')
      .field('maxDownloads', '5')
      .field('password', 'SecretPass123')
      .attach('file', textPath, { filename: 'secret_doc.txt', contentType: 'text/plain' });

    expect(uploadRes.status).toBe(201);
    const fileId = uploadRes.body.fileId;

    // Download without password -> 403
    const noPassRes = await request(app).get(`/api/download/${fileId}`);
    expect(noPassRes.status).toBe(403);
    expect(noPassRes.body.message).toContain('Password required');

    // Query-string password must no longer unlock the file
    const queryPassRes = await request(app).get(`/api/download/${fileId}?password=SecretPass123`);
    expect(queryPassRes.status).toBe(403);
    expect(queryPassRes.body.message).toContain('Password required');

    // Download with wrong password -> 403
    const wrongPassRes = await request(app)
      .post(`/api/download/${fileId}`)
      .send({ password: 'WrongPassword' });
    expect(wrongPassRes.status).toBe(403);
    expect(wrongPassRes.body.message).toContain('Incorrect password');

    // Download with correct password -> 200
    const correctPassRes = await request(app)
      .post(`/api/download/${fileId}`)
      .send({ password: 'SecretPass123' });
    expect(correctPassRes.status).toBe(200);
    expect(correctPassRes.headers['content-disposition']).toContain('secret_doc.txt');
  });

  it('5. should enforce single-use download limit and self-destruct file', async () => {
    const textPath = path.join(tmpTestDir, 'single_use.txt');
    fs.writeFileSync(textPath, 'Single use drop content');

    const uploadRes = await request(app)
      .post('/api/upload')
      .field('expiryMinutes', '60')
      .field('maxDownloads', '1')
      .attach('file', textPath, { filename: 'single_use.txt', contentType: 'text/plain' });

    expect(uploadRes.status).toBe(201);
    const fileId = uploadRes.body.fileId;

    // 1st download -> Success 200
    const firstDownload = await request(app).get(`/api/download/${fileId}`);
    expect(firstDownload.status).toBe(200);

    // 2nd download -> 410 Expired / Self-destructed
    const secondDownload = await request(app).get(`/api/download/${fileId}`);
    expect(secondDownload.status).toBe(410);
    expect(secondDownload.body.message).toContain('no longer available');
  });

  it('6. should retrieve file metadata via /api/file/:id/info', async () => {
    const pdfPath = path.join(tmpTestDir, 'meta_test.pdf');
    fs.writeFileSync(pdfPath, '%PDF-1.5 Metadata test content');

    const uploadRes = await request(app)
      .post('/api/upload')
      .field('expiryMinutes', '30')
      .field('maxDownloads', '3')
      .field('password', 'metaPass')
      .attach('file', pdfPath, { filename: 'meta_test.pdf', contentType: 'application/pdf' });

    expect(uploadRes.status).toBe(201);
    const fileId = uploadRes.body.fileId;

    const infoRes = await request(app).get(`/api/file/${fileId}/info`);
    expect(infoRes.status).toBe(200);
    expect(infoRes.body.success).toBe(true);
    expect(infoRes.body.file.originalName).toBe('meta_test.pdf');
    expect(infoRes.body.file.hasPassword).toBe(true);
    expect(infoRes.body.file.maxDownloads).toBe(3);
  });

  it('7. should return 404 for invalid UUID on metadata endpoint', async () => {
    const res = await request(app).get('/api/file/invalid-uuid-12345/info');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it('8. should return 410 Gone for expired files', async () => {
    const db = initializeSqlite();
    const expiredPath = path.join(uploadDir, 'expired_unit_test.txt');
    fs.writeFileSync(expiredPath, 'Already expired content');

    const expiredUuid = '00000000-0000-4000-8000-000000000001';
    const pastTime = new Date(Date.now() - 3600 * 1000).toISOString();

    db.prepare(`
      INSERT INTO files (id, original_name, stored_name, file_path, size, expires_at, max_downloads, download_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(expiredUuid, 'expired.txt', 'expired_unit_test.txt', expiredPath, 10, pastTime, 5, 0);

    const downloadRes = await request(app).get(`/api/download/${expiredUuid}`);
    expect(downloadRes.status).toBe(410);
    expect(downloadRes.body.message).toContain('expired');
  });

  it('9. should verify storage cleanup round removes expired database entries', () => {
    const result = performCleanupRound();
    expect(result).toBeDefined();
    expect(typeof result.expiredDeleted).toBe('number');
  });
});
