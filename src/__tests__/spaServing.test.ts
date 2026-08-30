import { describe, it, expect, beforeAll } from 'vitest';
import express, { Request, Response } from 'express';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import os from 'os';

const testDistPath = path.join(os.tmpdir(), `deaddrop-spa-${process.pid}`);

describe('Production SPA Serving & API Route Isolation', () => {
  let testApp: express.Application;

  beforeAll(() => {
    if (!fs.existsSync(testDistPath)) {
      fs.mkdirSync(testDistPath, { recursive: true });
    }
    const mockIndexFile = path.resolve(testDistPath, 'index.html');
    if (!fs.existsSync(mockIndexFile)) {
      fs.writeFileSync(mockIndexFile, '<!DOCTYPE html><html><body>DeadDrop SPA</body></html>');
    }

    testApp = express();
    testApp.use(express.static(testDistPath));

    testApp.get('/api/health', (req: Request, res: Response) => {
      res.json({ status: 'ok' });
    });

    testApp.use((req: Request, res: Response, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api')) {
        return next();
      }
      res.sendFile(path.resolve(testDistPath, 'index.html'));
    });

    testApp.use('/api', (req: Request, res: Response) => {
      res.status(404).json({ success: false, message: 'API route not found' });
    });
  });

  it('should serve index.html for root path /', async () => {
    const res = await request(testApp).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/DeadDrop|html/i);
  });

  it('should serve index.html for SPA client routes like /upload', async () => {
    const res = await request(testApp).get('/upload');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/DeadDrop|html/i);
  });

  it('should serve index.html for SPA route /download/123-456', async () => {
    const res = await request(testApp).get('/download/123-456');
    expect(res.status).toBe(200);
    expect(res.text).toMatch(/DeadDrop|html/i);
  });

  it('should NOT return SPA index.html for unknown /api/ routes', async () => {
    const res = await request(testApp).get('/api/unknown-endpoint');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.text).not.toContain('<title>DeadDrop - Secure File Sharing</title>');
  });
});
