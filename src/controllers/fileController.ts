import { Request, Response } from 'express';
import { getSqliteDb } from '../../backend/database/sqlite-setup.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

type SqliteFileRow = {
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

const uuidV4Pattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const uploadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const expiryRaw = req.body.expiryMinutes || req.body.expiry;
    const expiryTimeInMinutes = parseInt(expiryRaw, 10);
    if (isNaN(expiryTimeInMinutes) || expiryTimeInMinutes <= 0) {
      res.status(400).json({ success: false, message: 'Invalid expiry time' });
      return;
    }

    const expiresAt = new Date(Date.now() + expiryTimeInMinutes * 60 * 1000);

    const maxDownloads = req.body.maxDownloads ? parseInt(req.body.maxDownloads, 10) : 1;
    const fileId = uuidv4();
    const passwordHash = req.body.password ? await bcrypt.hash(req.body.password, 10) : null;

    const db = getSqliteDb();
    const insertFile = db.prepare(`
      INSERT INTO files (
        id,
        original_name,
        stored_name,
        file_path,
        size,
        expires_at,
        max_downloads,
        download_count,
        password_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertFile.run(
      fileId,
      req.file.originalname,
      req.file.filename,
      req.file.path,
      req.file.size,
      expiresAt.toISOString(),
      maxDownloads,
      0,
      passwordHash
    );

    res.status(201).json({
      success: true,
      fileId,
      downloadLink: `/api/download/${fileId}`,
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'An unknown error occurred' });
    }
  }
};
export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const fileIdParam = req.params.id;
    const fileId = Array.isArray(fileIdParam) ? fileIdParam[0] : fileIdParam;
    if (!uuidV4Pattern.test(fileId)) {
      res.status(404).json({ success: false, message: 'File not found' });
      return;
    }

    const db = getSqliteDb();
    const getFile = db.prepare('SELECT * FROM files WHERE id = ?');
    const file = getFile.get(fileId) as SqliteFileRow | undefined;

    if (!file) {
      res.status(410).json({ success: false, message: 'File has expired or is no longer available' });
      return;
    }

    const deleteFile = async () => {
      try {
        if (fs.existsSync(file.file_path)) {
          fs.unlinkSync(file.file_path);
        }
        db.prepare('DELETE FROM files WHERE id = ?').run(fileId);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    };

    if (Date.now() > new Date(file.expires_at).getTime()) {
      await deleteFile();
      res.status(410).json({ success: false, message: 'File has expired and is no longer available' });
      return;
    }

    if (file.download_count >= file.max_downloads) {
      await deleteFile();
      res.status(410).json({ success: false, message: 'Download limit reached' });
      return;
    }

    if (file.password_hash) {
      const providedPassword = req.query.password as string;
      if (!providedPassword) {
        res.status(403).json({ success: false, message: 'Password required' });
        return;
      }
      const isMatch = await bcrypt.compare(providedPassword, file.password_hash);
      if (!isMatch) {
        res.status(403).json({ success: false, message: 'Incorrect password' });
        return;
      }
    }

    const absolutePath = path.resolve(file.file_path);

    res.sendFile(absolutePath, async (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Error downloading file' });
        }
      } else {
        db.prepare('UPDATE files SET download_count = download_count + 1 WHERE id = ?').run(fileId);

        const refreshed = getFile.get(fileId) as SqliteFileRow | undefined;
        if (refreshed && refreshed.download_count >= refreshed.max_downloads) {
          await deleteFile();
        }
      }
    });
  } catch (error) {
    if (error instanceof Error) {
      res.status(500).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: 'An unknown error occurred' });
    }
  }
};
