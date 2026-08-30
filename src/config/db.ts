import dotenv from 'dotenv';
import { initializeSqlite } from '../../backend/database/sqlite-setup.js';
import { log } from '../utils/logger.js';

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    initializeSqlite();
    log('info', { event: 'startup', message: 'sqlite_ready' });
  } catch {
    log('error', { event: 'startup', message: 'sqlite_failed' });
    process.exit(1);
  }
};

export default connectDB;
