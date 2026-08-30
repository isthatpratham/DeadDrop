import { describe, expect, it } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';
import Database from 'better-sqlite3';
import {
  applySqlitePragmas,
  applySqliteSchema,
  initializeSqlite,
} from '../../backend/database/sqlite-setup.js';

const userFacingTables = (db: Database.Database): string[] =>
  (
    db
      .prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`)
      .all() as { name: string }[]
  ).map((row) => row.name);

describe('SQLite schema hygiene', () => {
  it('does not create unused users or messages tables on a new database', () => {
    const db = initializeSqlite();
    const names = userFacingTables(db);

    expect(names).toContain('files');
    expect(names).not.toContain('users');
    expect(names).not.toContain('messages');
  });

  it('does not drop users or messages tables that already exist', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deaddrop-schema-'));
    const dbPath = path.join(dir, 'legacy.db');
    const db = new Database(dbPath);

    db.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL,
        email TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE TABLE messages (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);

    applySqlitePragmas(db);
    applySqliteSchema(db);

    const names = userFacingTables(db);
    expect(names).toEqual(expect.arrayContaining(['users', 'messages', 'files']));

    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
