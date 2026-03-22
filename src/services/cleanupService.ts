import cron from 'node-cron';
import fs from 'fs';
import { getSqliteDb } from '../../backend/database/sqlite-setup.js';

type ExpiredFileRow = {
  id: string;
  file_path: string;
};

export const startCleanupJob = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running cleanup job...');
    try {
      const now = new Date().toISOString();
      const db = getSqliteDb();

      const expiredFiles = db
        .prepare('SELECT id, file_path FROM files WHERE expires_at < ?')
        .all(now) as ExpiredFileRow[];

      let deletedCount = 0;

      for (const file of expiredFiles) {
        try {
          if (fs.existsSync(file.file_path)) {
            fs.unlinkSync(file.file_path);
          }

          db.prepare('DELETE FROM files WHERE id = ?').run(file.id);
          deletedCount++;
        } catch (fileError) {
          console.error(`Failed to delete file ${file.id}:`, fileError);
        }
      }

      if (deletedCount > 0) {
        console.log(`Cleanup complete: ${deletedCount} expired file(s) deleted.`);
      } else {
        console.log('Cleanup complete: No expired files to delete.');
      }
    } catch (error) {
      console.error('Error during the scheduled cleanup job:', error);
    }
  });
};
