import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';
import { startCleanupJob, stopCleanupJob } from './services/cleanupService.js';
import { closeSqlite } from '../backend/database/sqlite-setup.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Connect to Database
connectDB();

// Start cron jobs
startCleanupJob();

const server = app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

export const gracefulShutdown = (signal: string, callback?: () => void) => {
  console.log(`Received ${signal}. Initiating graceful shutdown...`);

  stopCleanupJob();

  server.close(() => {
    console.log('HTTP server closed.');

    try {
      closeSqlite();
      console.log('SQLite connection closed.');
    } catch (err) {
      console.error('Error closing SQLite database:', err);
    }

    if (callback) {
      callback();
    } else {
      process.exit(0);
    }
  });

  setTimeout(() => {
    console.error('Forcefully shutting down server due to timeout.');
    if (!callback) {
      process.exit(1);
    }
  }, 10000).unref();
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

export { server };
