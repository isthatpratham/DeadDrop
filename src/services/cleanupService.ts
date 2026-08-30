import cron, { ScheduledTask } from 'node-cron';
import fs from 'fs';
import path from 'path';
import { getSqliteDb } from '../../backend/database/sqlite-setup.js';

type FileRow = {
  id: string;
  file_path: string;
};

let scheduledTask: ScheduledTask | null = null;

export const reconcileStorageDirectory = (): number => {
  try {
    const uploadDir = path.resolve(process.cwd(), 'uploads');
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
        console.warn(`Path safety check failed during reconciliation for: ${filePath}`);
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
          console.log(`Reconciled orphaned storage file deleted: ${filename}`);
        }
      } catch (fileErr) {
        console.error(`Error processing file during storage reconciliation ${filename}:`, fileErr);
      }
    }

    return unlinkedCount;
  } catch (error) {
    console.error('Error during storage directory reconciliation:', error);
    return 0;
  }
};

export const performCleanupRound = (): { expiredDeleted: number; orphanedDeleted: number } => {
  try {
    const nowIso = new Date().toISOString();
    const db = getSqliteDb();

    // 1. Delete records that are expired OR have reached max_downloads
    const expiredOrLimitFiles = db
      .prepare('SELECT id, file_path FROM files WHERE expires_at < ? OR download_count >= max_downloads')
      .all(nowIso) as FileRow[];

    let expiredDeleted = 0;

    for (const file of expiredOrLimitFiles) {
      try {
        if (fs.existsSync(file.file_path)) {
          fs.unlinkSync(file.file_path);
        }
        db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
        expiredDeleted++;
      } catch (fileError) {
        console.error(`Failed to clean up record ${file.id}:`, fileError);
      }
    }

    // 2. Reconcile orphaned files on disk
    const orphanedDeleted = reconcileStorageDirectory();

    return { expiredDeleted, orphanedDeleted };
  } catch (error) {
    console.error('Error during cleanup round:', error);
    return { expiredDeleted: 0, orphanedDeleted: 0 };
  }
};

export const startCleanupJob = (): ScheduledTask => {
  if (scheduledTask) {
    return scheduledTask;
  }

  // Run every 5 minutes
  scheduledTask = cron.schedule('*/5 * * * *', () => {
    console.log('Running scheduled cleanup job...');
    const result = performCleanupRound();
    console.log(`Cleanup job summary: ${result.expiredDeleted} database records cleaned, ${result.orphanedDeleted} orphaned files removed.`);
  });

  return scheduledTask;
};

export const stopCleanupJob = (): void => {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('Cleanup background cron job stopped.');
  }
};
