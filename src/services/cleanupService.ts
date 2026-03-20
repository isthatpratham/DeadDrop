import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { File } from '../models/File.js';

export const startCleanupJob = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    console.log('Running cleanup job...');
    try {
      const now = new Date();
      // Find files where the expiry time has passed
      const expiredFiles = await File.find({ expiresAt: { $lt: now } });

      let deletedCount = 0;

      for (const file of expiredFiles) {
        try {
          // Delete physical file
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
          // Delete database record
          await File.findByIdAndDelete(file._id);
          deletedCount++;
        } catch (fileError) {
          console.error(`Failed to delete file ${file._id}:`, fileError);
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
