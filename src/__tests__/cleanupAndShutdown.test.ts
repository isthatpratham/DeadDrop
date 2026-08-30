import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { initializeSqlite, closeSqlite } from '../../backend/database/sqlite-setup.js';
import { performCleanupRound, reconcileStorageDirectory, startCleanupJob, stopCleanupJob } from '../services/cleanupService.js';

const uploadDir = path.resolve(process.cwd(), 'uploads');

describe('Storage Reconciliation & Graceful Shutdown', () => {
  beforeAll(() => {
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    initializeSqlite();
  });

  afterAll(() => {
    stopCleanupJob();
    try {
      closeSqlite();
    } catch {
      // Ignore if already closed
    }
  });

  it('should clean expired database records and physical files', () => {
    const db = initializeSqlite();
    const testId = uuidv4();
    const expiredFilePath = path.join(uploadDir, `test_expired_${testId}.txt`);
    fs.writeFileSync(expiredFilePath, 'expired file content');

    const pastExpiry = new Date(Date.now() - 3600 * 1000).toISOString();
    db.prepare(`
      INSERT INTO files (id, original_name, stored_name, file_path, size, expires_at, max_downloads, download_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(testId, 'expired.txt', `test_expired_${testId}.txt`, expiredFilePath, 20, pastExpiry, 5, 0);

    const result = performCleanupRound();
    expect(result.expiredDeleted).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(expiredFilePath)).toBe(false);

    const row = db.prepare('SELECT * FROM files WHERE id = ?').get(testId);
    expect(row).toBeUndefined();
  });

  it('should clean records that have reached max_downloads', () => {
    const db = initializeSqlite();
    const testId = uuidv4();
    const limitFilePath = path.join(uploadDir, `test_limit_${testId}.txt`);
    fs.writeFileSync(limitFilePath, 'download limit file content');

    const futureExpiry = new Date(Date.now() + 3600 * 1000).toISOString();
    db.prepare(`
      INSERT INTO files (id, original_name, stored_name, file_path, size, expires_at, max_downloads, download_count)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(testId, 'limit.txt', `test_limit_${testId}.txt`, limitFilePath, 25, futureExpiry, 1, 1);

    const result = performCleanupRound();
    expect(result.expiredDeleted).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(limitFilePath)).toBe(false);

    const row = db.prepare('SELECT * FROM files WHERE id = ?').get(testId);
    expect(row).toBeUndefined();
  });

  it('should delete old orphaned files from upload directory during reconciliation', () => {
    const testId = uuidv4();
    const orphanedFilePath = path.join(uploadDir, `test_orphaned_${testId}.txt`);
    fs.writeFileSync(orphanedFilePath, 'orphaned content');

    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000);
    fs.utimesSync(orphanedFilePath, thirtyMinsAgo, thirtyMinsAgo);

    const unlinkedCount = reconcileStorageDirectory();
    expect(unlinkedCount).toBeGreaterThanOrEqual(1);
    expect(fs.existsSync(orphanedFilePath)).toBe(false);
  });

  it('should NOT delete recent files during reconciliation (less than 15 mins old)', () => {
    const testId = uuidv4();
    const recentFilePath = path.join(uploadDir, `test_recent_${testId}.txt`);
    fs.writeFileSync(recentFilePath, 'recent unindexed content');

    reconcileStorageDirectory();
    expect(fs.existsSync(recentFilePath)).toBe(true);

    if (fs.existsSync(recentFilePath)) {
      fs.unlinkSync(recentFilePath);
    }
  });

  it('should start and stop cleanup cron job without errors', () => {
    const task = startCleanupJob();
    expect(task).toBeDefined();
    stopCleanupJob();
  });
});
