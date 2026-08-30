import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { getUploadDir } from '../../backend/database/sqlite-setup.js';
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, extensionForMime } from './uploadConstraints.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    try {
      const uploadDir = getUploadDir();
      fs.mkdirSync(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error instanceof Error ? error : new Error('Failed to prepare upload directory'), '');
    }
  },
  filename: (req, file, cb) => {
    const ext = extensionForMime(file.mimetype) || '';
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const upload = multer({
  storage,
  limits: {
    fileSize: MAX_UPLOAD_BYTES,
  },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});
