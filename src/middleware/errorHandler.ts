import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import multer from 'multer';
import { log, requestContext } from '../utils/logger.js';

const removeUploadedFile = (req: Request): void => {
  const uploaded = req.file;
  if (uploaded?.path && fs.existsSync(uploaded.path)) {
    fs.unlinkSync(uploaded.path);
  }
};

export const errorHandler = (err: unknown, req: Request, res: Response, next: NextFunction): void => {
  if (res.headersSent) {
    next(err);
    return;
  }

  removeUploadedFile(req);

  if (err instanceof multer.MulterError) {
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'File exceeds the 10MB limit'
      : err.message;
    log('warn', { event: 'upload_fail', ...requestContext(req), status: 400, message });
    res.status(400).json({ success: false, message });
    return;
  }

  if (err instanceof Error && err.message === 'Invalid file type') {
    log('warn', { event: 'upload_fail', ...requestContext(req), status: 400, message: 'Invalid file type' });
    res.status(400).json({ success: false, message: 'Invalid file type' });
    return;
  }

  const parseError = err as { type?: string; status?: number; expose?: boolean };
  if (err instanceof SyntaxError || parseError.type === 'entity.parse.failed') {
    log('warn', { event: 'request_fail', ...requestContext(req), status: 400, message: 'Invalid JSON' });
    res.status(400).json({ success: false, message: 'Invalid JSON' });
    return;
  }

  log('error', { event: 'server_error', ...requestContext(req), status: 500 });
  res.status(500).json({ success: false, message: 'An unknown error occurred' });
};
