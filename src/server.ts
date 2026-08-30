import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import { startCleanupJob, stopCleanupJob } from './services/cleanupService.js';
import { closeSqlite } from '../backend/database/sqlite-setup.js';
import { log } from './utils/logger.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Start cron jobs
startCleanupJob();

const server = app.listen(PORT, () => {
  log('info', { event: 'startup', message: `listening on ${PORT}` });
});

export const gracefulShutdown = (signal: string, callback?: () => void) => {
  log('info', { event: 'shutdown', signal });

  stopCleanupJob();

  server.close(() => {
    try {
      closeSqlite();
    } catch {
      log('error', { event: 'shutdown', signal, message: 'sqlite_close_failed' });
    }

    if (callback) {
      callback();
    } else {
      process.exit(0);
    }
  });

  setTimeout(() => {
    log('error', { event: 'shutdown', signal, message: 'timeout' });
    if (!callback) {
      process.exit(1);
    }
  }, 10000).unref();
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export { server };
