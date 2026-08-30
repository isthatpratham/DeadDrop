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

    const columns = (db.pragma('table_info(files)') as { name: string }[]).map((column) => column.name);
    expect(columns).toContain('last_download_at');
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

  it('adds last_download_at to existing files tables without dropping data', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'deaddrop-migrate-'));
    const dbPath = path.join(dir, 'legacy-files.db');
    const db = new Database(dbPath);

    db.exec(`
      CREATE TABLE files (
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
      );
    `);
    db.prepare(`
      INSERT INTO files (id, original_name, stored_name, file_path, size, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('keep-me', 'a.txt', 'a.txt', '/tmp/a.txt', 1, new Date().toISOString());

    applySqliteSchema(db);

    const columns = (db.pragma('table_info(files)') as { name: string }[]).map((column) => column.name);
    expect(columns).toContain('last_download_at');
    expect(db.prepare('SELECT id FROM files WHERE id = ?').get('keep-me')).toEqual({ id: 'keep-me' });

    db.close();
    fs.rmSync(dir, { recursive: true, force: true });
  });
});
