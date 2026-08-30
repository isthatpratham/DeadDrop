import fs from 'fs';
import os from 'os';
import path from 'path';

export const realDbPath = path.resolve(process.cwd(), 'backend', 'database', 'deaddrop.db');
export const realUploadsPath = path.resolve(process.cwd(), 'uploads');

export const developerStorageSnapshot = {
  dbExists: fs.existsSync(realDbPath),
  dbMtimeMs: fs.existsSync(realDbPath) ? fs.statSync(realDbPath).mtimeMs : 0,
  dbSize: fs.existsSync(realDbPath) ? fs.statSync(realDbPath).size : 0,
  uploadNames: fs.existsSync(realUploadsPath)
    ? new Set(fs.readdirSync(realUploadsPath))
    : new Set<string>(),
};

if (!process.env.SQLITE_PATH) {
  const testRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'deaddrop-vitest-'));
  process.env.SQLITE_PATH = path.join(testRoot, 'test.db');
  process.env.UPLOAD_DIR = path.join(testRoot, 'uploads');
}

fs.mkdirSync(process.env.UPLOAD_DIR as string, { recursive: true });
fs.mkdirSync(path.dirname(process.env.SQLITE_PATH as string), { recursive: true });

process.env.RATE_LIMIT_API_MAX ??= '10000';
process.env.RATE_LIMIT_UPLOAD_MAX ??= '10000';
process.env.RATE_LIMIT_DOWNLOAD_MAX ??= '10000';
