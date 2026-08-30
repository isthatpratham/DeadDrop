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
  `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username);`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);`,
  `CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );`,
  `CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);`,
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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );`,
  `CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at);`,
  `CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);`
];

export const initializeSqlite = () => {
  if (dbInstance) {
    return dbInstance;
  }

  const databasePath = getSqlitePath();
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  dbInstance = new Database(databasePath);
  dbInstance.pragma('journal_mode = WAL');
  dbInstance.pragma('foreign_keys = ON');

  for (const statement of sqliteSchemaStatements) {
    dbInstance.exec(statement);
  }

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

