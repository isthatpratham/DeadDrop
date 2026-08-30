import { Router } from 'express';
import { upload } from '../utils/multer.js';
import { uploadFile, downloadFile, getFileInfo } from '../controllers/fileController.js';

const router = Router();

router.post('/upload', upload.single('file'), uploadFile);
router.get('/download/:id', downloadFile);
router.get('/file/:id/info', getFileInfo);

export default router;
