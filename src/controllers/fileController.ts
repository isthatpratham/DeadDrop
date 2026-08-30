import { Request, Response } from 'express';
import { getSqliteDb } from '../../backend/database/sqlite-setup.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { formatContentDisposition } from '../utils/disposition.js';
import { validateFileMagicBytes } from '../utils/fileValidation.js';
import { parseExpiryMinutes, parseMaxDownloads } from '../utils/uploadConstraints.js';
import { log, requestContext } from '../utils/logger.js';

const removeUploadedFile = (filePath?: string): void => {
  if (filePath && fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

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
      log('warn', { event: 'upload_fail', ...requestContext(req), status: 400, message: 'No file uploaded' });
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const expiry = parseExpiryMinutes(req.body.expiryMinutes || req.body.expiry);
    if (!expiry.ok) {
      removeUploadedFile(req.file.path);
      log('warn', { event: 'upload_fail', ...requestContext(req), status: 400, message: expiry.message });
      res.status(400).json({ success: false, message: expiry.message });
      return;
    }

    const downloads = parseMaxDownloads(req.body.maxDownloads);
    if (!downloads.ok) {
      removeUploadedFile(req.file.path);
      log('warn', { event: 'upload_fail', ...requestContext(req), status: 400, message: downloads.message });
      res.status(400).json({ success: false, message: downloads.message });
      return;
    }

    const validation = validateFileMagicBytes(req.file.path, req.file.mimetype);
    if (!validation.valid) {
      removeUploadedFile(req.file.path);
      log('warn', { event: 'upload_fail', ...requestContext(req), status: 400, message: validation.message || 'Invalid file content' });
      res.status(400).json({ success: false, message: validation.message || 'Invalid file content' });
      return;
    }

    const expiresAt = new Date(Date.now() + expiry.value * 60 * 1000);
    const maxDownloads = downloads.value;
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

    log('info', { event: 'upload_success', ...requestContext(req), status: 201, fileId, size: req.file.size });
    res.status(201).json({
      success: true,
      fileId,
      downloadLink: `/api/download/${fileId}`,
    });
  } catch {
    removeUploadedFile(req.file?.path);
    log('error', { event: 'upload_fail', ...requestContext(req), status: 500 });
    res.status(500).json({ success: false, message: 'An unknown error occurred' });
  }
};
export const downloadFile = async (req: Request, res: Response): Promise<void> => {
  try {
    const fileIdParam = req.params.id;
    const fileId = Array.isArray(fileIdParam) ? fileIdParam[0] : fileIdParam;
    if (!uuidV4Pattern.test(fileId)) {
      log('warn', { event: 'download_fail', ...requestContext(req), status: 404 });
      res.status(404).json({ success: false, message: 'File not found' });
      return;
    }

    const db = getSqliteDb();
    const getFile = db.prepare('SELECT * FROM files WHERE id = ?');
    const file = getFile.get(fileId) as SqliteFileRow | undefined;

    if (!file) {
      log('warn', { event: 'download_fail', ...requestContext(req), status: 410, fileId });
      res.status(410).json({ success: false, message: 'File has expired or is no longer available' });
      return;
    }

    const deleteFile = async () => {
      try {
        if (fs.existsSync(file.file_path)) {
          fs.unlinkSync(file.file_path);
        }
        db.prepare('DELETE FROM files WHERE id = ?').run(fileId);
      } catch {
        log('error', { event: 'download_fail', ...requestContext(req), fileId, message: 'delete_failed' });
      }
    };

    if (Date.now() > new Date(file.expires_at).getTime()) {
      log('warn', { event: 'download_fail', ...requestContext(req), status: 410, fileId, message: 'expired' });
      res.status(410).json({ success: false, message: 'File has expired and is no longer available' });
      return;
    }

    if (file.download_count >= file.max_downloads) {
      log('warn', { event: 'download_fail', ...requestContext(req), status: 410, fileId, message: 'limit_reached' });
      res.status(410).json({ success: false, message: 'Download limit reached' });
      return;
    }

    if (file.password_hash) {
      const providedPassword = typeof req.body?.password === 'string' ? req.body.password : '';
      if (!providedPassword) {
        log('warn', { event: 'password_fail', ...requestContext(req), status: 403, fileId, message: 'required' });
        res.status(403).json({ success: false, message: 'Password required' });
        return;
      }
      const isMatch = await bcrypt.compare(providedPassword, file.password_hash);
      if (!isMatch) {
        log('warn', { event: 'password_fail', ...requestContext(req), status: 403, fileId, message: 'incorrect' });
        res.status(403).json({ success: false, message: 'Incorrect password' });
        return;
      }
    }

    // Reserve the slot before streaming. A failed transfer still consumes the
    // slot so one-time secrets cannot be retried after a partial send.
    const reservation = db.prepare(`
      UPDATE files
      SET download_count = download_count + 1
      WHERE id = ?
        AND download_count < max_downloads
        AND expires_at > ?
    `).run(fileId, new Date().toISOString());

    if (reservation.changes === 0) {
      log('warn', { event: 'download_fail', ...requestContext(req), status: 410, fileId, message: 'reservation_lost' });
      res.status(410).json({ success: false, message: 'File has expired or is no longer available' });
      return;
    }

    const reservedCount = file.download_count + 1;
    const absolutePath = path.resolve(file.file_path);
    res.setHeader('Content-Disposition', formatContentDisposition(file.original_name));

    res.sendFile(absolutePath, async (err) => {
      if (err) {
        log('error', { event: 'download_fail', ...requestContext(req), status: 500, fileId });
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Error downloading file' });
        }
        if (reservedCount >= file.max_downloads) {
          await deleteFile();
        }
        return;
      }

      log('info', { event: 'download_success', ...requestContext(req), status: 200, fileId });
      if (reservedCount >= file.max_downloads) {
        await deleteFile();
      }
    });
  } catch {
    log('error', { event: 'download_fail', ...requestContext(req), status: 500 });
    if (!res.headersSent) {
      res.status(500).json({ success: false, message: 'An unknown error occurred' });
    }
  }
};

export const getFileInfo = async (req: Request, res: Response): Promise<void> => {
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
      res.status(404).json({ success: false, message: 'File not found' });
      return;
    }

    if (Date.now() > new Date(file.expires_at).getTime() || file.download_count >= file.max_downloads) {
      res.status(410).json({ success: false, message: 'File has expired or is no longer available' });
      return;
    }

    res.status(200).json({
      success: true,
      file: {
        id: file.id,
        originalName: file.original_name,
        size: file.size,
        expiresAt: file.expires_at,
        maxDownloads: file.max_downloads,
        downloadCount: file.download_count,
        hasPassword: Boolean(file.password_hash),
        createdAt: file.created_at,
      },
    });
  } catch {
    log('error', { event: 'server_error', ...requestContext(req), status: 500, path: req.path });
    res.status(500).json({ success: false, message: 'An unknown error occurred' });
  }
};
