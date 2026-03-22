import dotenv from 'dotenv';
import { initializeSqlite, getSqlitePath } from '../../backend/database/sqlite-setup.js';

dotenv.config();

const connectDB = async (): Promise<void> => {
  try {
    initializeSqlite();
    console.log(`SQLite Connected: ${getSqlitePath()}`);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`SQLite connection error: ${error.message}`);
    } else {
      console.error('An unknown error occurred during SQLite connection');
    }
    process.exit(1);
  }
};

export default connectDB;
