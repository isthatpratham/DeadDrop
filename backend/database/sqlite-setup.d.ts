import Database from 'better-sqlite3';

export const sqliteSchemaStatements: string[];
export const initializeSqlite: () => Database.Database;
export const getSqliteDb: () => Database.Database;
export const closeSqlite: () => void;
export const getSqlitePath: () => string;
export const getUploadDir: () => string;
