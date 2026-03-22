declare module '*sqlite-setup.js' {
  import type Database from 'better-sqlite3';

  export const sqliteSchemaStatements: string[];
  export const initializeSqlite: () => Database.Database;
  export const getSqliteDb: () => Database.Database;
  export const getSqlitePath: () => string;
}
