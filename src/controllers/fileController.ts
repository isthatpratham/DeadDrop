import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { File } from '../models/File.js';
import fs from 'fs';
import path from 'path';
import bcrypt from 'bcrypt';

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
    
    const newFile = new File({
      originalName: req.file.originalname,
      storedName: req.file.filename,
      path: req.file.path,
      size: req.file.size,
      expiresAt,
      maxDownloads,
      downloadCount: 0,
      password: req.body.password || undefined,
    });

    const savedFile = await newFile.save();

    res.status(201).json({
      success: true,
      fileId: savedFile._id.toString(),
      downloadLink: `/api/download/${savedFile._id.toString()}`,
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
    const fileId = req.params.id;
    if (!mongoose.isValidObjectId(fileId)) {
      res.status(404).json({ success: false, message: 'File not found' });
      return;
    }
    const file = await File.findById(fileId);

    if (!file) {
      res.status(410).json({ success: false, message: 'File has expired or is no longer available' });
      return;
    }

    const deleteFile = async () => {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        await File.findByIdAndDelete(fileId);
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    };

    if (Date.now() > file.expiresAt.getTime()) {
      await deleteFile();
      res.status(410).json({ success: false, message: 'File has expired and is no longer available' });
      return;
    }

    if (file.downloadCount >= file.maxDownloads) {
      await deleteFile();
      res.status(410).json({ success: false, message: 'Download limit reached' });
      return;
    }

    if (file.password) {
      const providedPassword = req.query.password as string;
      if (!providedPassword) {
        res.status(403).json({ success: false, message: 'Password required' });
        return;
      }
      const isMatch = await bcrypt.compare(providedPassword, file.password);
      if (!isMatch) {
        res.status(403).json({ success: false, message: 'Incorrect password' });
        return;
      }
    }

    const absolutePath = path.resolve(file.path);

    res.sendFile(absolutePath, async (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({ success: false, message: 'Error downloading file' });
        }
      } else {
        file.downloadCount += 1;
        await file.save();

        if (file.downloadCount >= file.maxDownloads) {
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
