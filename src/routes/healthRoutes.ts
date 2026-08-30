import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { getSqliteDb, getUploadDir } from '../../backend/database/sqlite-setup.js';

const router = Router();

router.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({ success: true, status: 'ok' });
});

router.get('/ready', (_req: Request, res: Response) => {
  try {
    const db = getSqliteDb();
    db.prepare('SELECT 1 AS ok').get();
  } catch {
    res.status(503).json({ success: false, status: 'not_ready', message: 'SQLite is not available' });
    return;
  }

  try {
    const uploadDir = getUploadDir();
    fs.mkdirSync(uploadDir, { recursive: true });
    fs.accessSync(uploadDir, fs.constants.W_OK);

    const probePath = path.join(uploadDir, `.ready-probe-${process.pid}-${Date.now()}`);
    fs.writeFileSync(probePath, 'ok');
    fs.unlinkSync(probePath);
  } catch {
    res.status(503).json({ success: false, status: 'not_ready', message: 'Upload directory is not writable' });
    return;
  }

  res.status(200).json({ success: true, status: 'ready' });
});

export default router;
