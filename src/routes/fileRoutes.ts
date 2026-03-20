import { Router } from 'express';
import { upload } from '../utils/multer.js';
import { uploadFile, downloadFile } from '../controllers/fileController.js';

const router = Router();

router.post('/upload', upload.single('file'), uploadFile);
router.get('/download/:id', downloadFile);

export default router;
