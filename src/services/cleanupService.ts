import cron, { ScheduledTask } from 'node-cron';
import fs from 'fs';
import path from 'path';
import { getSqliteDb, getUploadDir } from '../../backend/database/sqlite-setup.js';
import { log } from '../utils/logger.js';

type FileRow = {
  id: string;
  file_path: string;
};

let scheduledTask: ScheduledTask | null = null;

export const reconcileStorageDirectory = (): number => {
  try {
    const uploadDir = getUploadDir();
    if (!fs.existsSync(uploadDir)) {
      return 0;
    }

    const db = getSqliteDb();
    const activeRows = db.prepare('SELECT file_path FROM files').all() as { file_path: string }[];
    const activePathsSet = new Set<string>();

    for (const row of activeRows) {
      if (row.file_path) {
        activePathsSet.add(path.resolve(row.file_path));
      }
    }

    const filesInUploadDir = fs.readdirSync(uploadDir);
    const now = Date.now();
    const fifteenMinutesMs = 15 * 60 * 1000;
    let unlinkedCount = 0;

    for (const filename of filesInUploadDir) {
      const filePath = path.resolve(uploadDir, filename);

      // Path Safety / Containment Check: ensure file is directly inside uploadDir
      if (!filePath.startsWith(uploadDir)) {
        log('warn', { event: 'cleanup', message: 'path_safety_rejected' });
        continue;
      }

      try {
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
          continue;
        }

        // Avoid deleting files modified within the last 15 minutes (in case upload is in progress)
        if (now - stats.mtimeMs < fifteenMinutesMs) {
          continue;
        }

        // If file is not in active database records, it is orphaned
        if (!activePathsSet.has(filePath)) {
          fs.unlinkSync(filePath);
          unlinkedCount++;
        }
      } catch {
        log('error', { event: 'cleanup', message: 'reconcile_file_failed' });
      }
    }

    return unlinkedCount;
  } catch {
    log('error', { event: 'cleanup', message: 'reconcile_failed' });
    return 0;
  }
};

export const CLEANUP_IN_FLIGHT_GRACE_MS = 5 * 60 * 1000;

export const performCleanupRound = (): { expiredDeleted: number; orphanedDeleted: number } => {
  try {
    const nowIso = new Date().toISOString();
    const graceIso = new Date(Date.now() - CLEANUP_IN_FLIGHT_GRACE_MS).toISOString();
    const db = getSqliteDb();

    // Skip rows reserved recently so cleanup cannot unlink a file mid-sendFile.
    const expiredOrLimitFiles = db
      .prepare(`
        SELECT id, file_path FROM files
        WHERE (
          expires_at < ?
          AND (last_download_at IS NULL OR last_download_at < ?)
        )
        OR (
          download_count >= max_downloads
          AND (last_download_at IS NULL OR last_download_at < ?)
        )
      `)
      .all(nowIso, graceIso, graceIso) as FileRow[];

    let expiredDeleted = 0;

    for (const file of expiredOrLimitFiles) {
      try {
        if (fs.existsSync(file.file_path)) {
          fs.unlinkSync(file.file_path);
        }
        db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
        expiredDeleted++;
      } catch {
        log('error', { event: 'cleanup', fileId: file.id, message: 'record_cleanup_failed' });
      }
    }

    // 2. Reconcile orphaned files on disk
    const orphanedDeleted = reconcileStorageDirectory();
    log('info', { event: 'cleanup', expiredDeleted, orphanedDeleted });

    return { expiredDeleted, orphanedDeleted };
  } catch {
    log('error', { event: 'cleanup', message: 'round_failed' });
    return { expiredDeleted: 0, orphanedDeleted: 0 };
  }
};

export const startCleanupJob = (): ScheduledTask => {
  if (scheduledTask) {
    return scheduledTask;
  }

  // Run every 5 minutes
  scheduledTask = cron.schedule('*/5 * * * *', () => {
    performCleanupRound();
  });

  return scheduledTask;
};

export const stopCleanupJob = (): void => {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    log('info', { event: 'cleanup', message: 'stopped' });
  }
};
