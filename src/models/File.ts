export interface IFile {
  id: string;
  originalName: string;
  storedName: string;
  path: string;
  size: number;
  expiresAt: Date;
  maxDownloads: number;
  downloadCount: number;
  password?: string;
  createdAt: Date;
}

export type SqliteFileRow = {
  id: string;
  original_name: string;
  stored_name: string;
  file_path: string;
  size: number;
  expires_at: string;
  max_downloads: number;
  download_count: number;
  password_hash: string | null;
  created_at: string;
};

export const CREATE_FILES_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS files (
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
  )
`;

export const toIFile = (row: SqliteFileRow): IFile => ({
  id: row.id,
  originalName: row.original_name,
  storedName: row.stored_name,
  path: row.file_path,
  size: row.size,
  expiresAt: new Date(row.expires_at),
  maxDownloads: row.max_downloads,
  downloadCount: row.download_count,
  password: row.password_hash ?? undefined,
  createdAt: new Date(row.created_at),
});
