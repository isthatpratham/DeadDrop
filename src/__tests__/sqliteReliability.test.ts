import { describe, expect, it } from 'vitest';
import { initializeSqlite } from '../../backend/database/sqlite-setup.js';

describe('SQLite reliability', () => {
  it('sets busy_timeout to 5000 milliseconds', () => {
    const db = initializeSqlite();
    const timeout = db.pragma('busy_timeout', { simple: true });
    expect(timeout).toBe(5000);
  });

  it('indexes files that have reached max_downloads for cleanup', () => {
    const db = initializeSqlite();
    const indexes = db
      .prepare(`SELECT name, sql FROM sqlite_master WHERE type = 'index' AND tbl_name = 'files'`)
      .all() as { name: string; sql: string | null }[];

    const exhausted = indexes.find((index) => index.name === 'idx_files_exhausted_downloads');
    expect(exhausted).toBeDefined();
    expect(exhausted?.sql).toMatch(/download_count\s*>=\s*max_downloads/i);
  });
});
