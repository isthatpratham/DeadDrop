import dotenv from 'dotenv';
import app from './app.js';
import connectDB from './config/db.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

import { startCleanupJob } from './services/cleanupService.js';

// Connect to Database
connectDB();

// Start cron jobs
startCleanupJob();

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
