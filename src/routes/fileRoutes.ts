import { Router } from 'express';
import { upload } from '../utils/multer.js';
import { uploadFile, downloadFile, getFileInfo } from '../controllers/fileController.js';
import { createDownloadRateLimiter, createUploadRateLimiter } from '../middleware/rateLimits.js';

const router = Router();
const uploadLimiter = createUploadRateLimiter();
const downloadLimiter = createDownloadRateLimiter();

router.post('/upload', uploadLimiter, upload.single('file'), uploadFile);
router.get('/download/:id', downloadLimiter, downloadFile);
router.post('/download/:id', downloadLimiter, downloadFile);
router.get('/file/:id/info', getFileInfo);

export default router;
