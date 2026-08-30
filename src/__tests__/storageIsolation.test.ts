import { describe, it, expect } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { getSqlitePath, getUploadDir } from '../../backend/database/sqlite-setup.js';
import { developerStorageSnapshot, realDbPath, realUploadsPath } from './setup.js';

const tmpRoot = path.resolve(os.tmpdir());

const isInside = (target: string, root: string): boolean => {
  const relative = path.relative(root, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
};

describe('Test storage isolation', () => {
  it('should point SQLITE_PATH and UPLOAD_DIR at the process temp directory', () => {
    expect(process.env.SQLITE_PATH).toBeDefined();
    expect(process.env.UPLOAD_DIR).toBeDefined();
    expect(isInside(getSqlitePath(), tmpRoot)).toBe(true);
    expect(isInside(getUploadDir(), tmpRoot)).toBe(true);
    expect(getSqlitePath()).not.toBe(realDbPath);
    expect(getUploadDir()).not.toBe(realUploadsPath);
  });

  it('should not create or modify the developer SQLite database', () => {
    if (developerStorageSnapshot.dbExists) {
      expect(fs.existsSync(realDbPath)).toBe(true);
      const current = fs.statSync(realDbPath);
      expect(current.mtimeMs).toBe(developerStorageSnapshot.dbMtimeMs);
      expect(current.size).toBe(developerStorageSnapshot.dbSize);
    } else {
      expect(fs.existsSync(realDbPath)).toBe(false);
    }
  });

  it('should not add files to the developer uploads directory', () => {
    if (!fs.existsSync(realUploadsPath)) {
      return;
    }

    const currentNames = new Set(fs.readdirSync(realUploadsPath));
    for (const name of currentNames) {
      expect(developerStorageSnapshot.uploadNames.has(name)).toBe(true);
    }
  });
});
