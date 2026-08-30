import fs from 'fs';
import path from 'path';
import Database from 'better-sqlite3';

let dbInstance;

export const getSqlitePath = () => {
  if (process.env.SQLITE_PATH) {
    return path.resolve(process.env.SQLITE_PATH);
  }
  return path.resolve(process.cwd(), 'backend', 'database', 'deaddrop.db');
};

export const getUploadDir = () => {
  if (process.env.UPLOAD_DIR) {
    return path.resolve(process.env.UPLOAD_DIR);
  }
  return path.resolve(process.cwd(), 'uploads');
};

export const sqliteSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      original_name TEXT NOT NULL,
      stored_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      size INTEGER NOT NULL,
      expires_at TEXT NOT NULL,
      max_downloads INTEGER NOT NULL DEFAULT 1,
      download_count INTEGER NOT NULL DEFAULT 0,
      password_hash TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_download_at TEXT
    );`,
  `CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at);`,
  `CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);`,
  `CREATE INDEX IF NOT EXISTS idx_files_exhausted_downloads
      ON files(download_count, max_downloads)
      WHERE download_count >= max_downloads;`
];

export const applySqlitePragmas = (db) => {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('busy_timeout = 5000');
};

export const applySqliteSchema = (db) => {
  for (const statement of sqliteSchemaStatements) {
    db.exec(statement);
  }

  const columns = db.pragma('table_info(files)');
  if (Array.isArray(columns) && !columns.some((column) => column.name === 'last_download_at')) {
    db.exec('ALTER TABLE files ADD COLUMN last_download_at TEXT');
  }
};

export const initializeSqlite = () => {
  if (dbInstance) {
    return dbInstance;
  }

  const databasePath = getSqlitePath();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  dbInstance = new Database(databasePath);
  applySqlitePragmas(dbInstance);
  applySqliteSchema(dbInstance);

  return dbInstance;
};

export const getSqliteDb = () => {
  if (!dbInstance) {
    throw new Error('SQLite is not initialized. Call initializeSqlite() first.');
  }

  return dbInstance;
};

export const closeSqlite = () => {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
};

