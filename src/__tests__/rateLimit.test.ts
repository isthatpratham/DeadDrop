import { describe, it, expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createRateLimiter } from '../middleware/rateLimits.js';
import { parseTrustProxy } from '../config/trustProxy.js';

const buildLimitedApp = (trustProxy: string | undefined, max = 2) => {
  const app = express();
  app.set('trust proxy', parseTrustProxy(trustProxy));
  app.use('/api/download/:id', createRateLimiter(60_000, max));
  app.use('/api/upload', createRateLimiter(60_000, max));
  app.use('/api', createRateLimiter(60_000, max));
  app.post('/api/download/:id', (req, res) => {
    res.status(403).json({ success: false, message: 'Password required' });
  });
  app.post('/api/upload', (req, res) => {
    res.status(400).json({ success: false, message: 'No file uploaded' });
  });
  return app;
};

describe('Rate limiting', () => {
  it('returns JSON 429 after repeated password attempts', async () => {
    const app = buildLimitedApp('1', 2);

    await request(app).post('/api/download/11111111-1111-4111-8111-111111111111').expect(403);
    await request(app).post('/api/download/11111111-1111-4111-8111-111111111111').expect(403);
    const limited = await request(app).post('/api/download/11111111-1111-4111-8111-111111111111');

    expect(limited.status).toBe(429);
    expect(limited.body).toEqual({ success: false, message: 'Too many requests' });
  });

  it('returns JSON 429 after an upload flood', async () => {
    const app = buildLimitedApp('1', 2);

    await request(app).post('/api/upload').expect(400);
    await request(app).post('/api/upload').expect(400);
    const limited = await request(app).post('/api/upload');

    expect(limited.status).toBe(429);
    expect(limited.body.success).toBe(false);
  });

  it('honors X-Forwarded-For when trust proxy is enabled', async () => {
    const app = buildLimitedApp('true', 1);

    await request(app).post('/api/upload').set('X-Forwarded-For', '203.0.113.10').expect(400);
    const sameClient = await request(app).post('/api/upload').set('X-Forwarded-For', '203.0.113.10');
    const otherClient = await request(app).post('/api/upload').set('X-Forwarded-For', '203.0.113.11');

    expect(sameClient.status).toBe(429);
    expect(otherClient.status).toBe(400);
  });

  it('ignores X-Forwarded-For when trust proxy is false', async () => {
    const app = buildLimitedApp('false', 1);

    await request(app).post('/api/upload').set('X-Forwarded-For', '198.51.100.10').expect(400);
    const spoofed = await request(app).post('/api/upload').set('X-Forwarded-For', '198.51.100.11');

    expect(spoofed.status).toBe(429);
  });

  it('uses a numeric hop count when TRUST_PROXY is a number', async () => {
    expect(parseTrustProxy('1')).toBe(1);
    const app = buildLimitedApp('1', 1);

    await request(app).post('/api/upload').set('X-Forwarded-For', '203.0.113.20').expect(400);
    const limited = await request(app).post('/api/upload').set('X-Forwarded-For', '203.0.113.20');
    expect(limited.status).toBe(429);
  });
});
