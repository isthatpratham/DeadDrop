export interface FileInfo {
  id: string;
  originalName: string;
  size: number;
  expiresAt: string;
  maxDownloads: number;
  downloadCount: number;
  hasPassword: boolean;
  createdAt: string;
}

export type FileInfoResult =
  | { status: 'ok'; file: FileInfo }
  | { status: 'expired' }
  | { status: 'invalid' }
  | { status: 'error'; message: string };
