import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import app from '../app.js';
import { initializeSqlite, closeSqlite } from '../../backend/database/sqlite-setup.js';

describe('Health and readiness endpoints', () => {
  beforeAll(() => {
    initializeSqlite();
  });

  afterAll(() => {
    try {
      closeSqlite();
    } catch {
      // Ignore
    }
  });

  it('GET /api/health reports that the process is alive', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('ok');
  });

  it('GET /api/ready succeeds when SQLite and uploads are available', async () => {
    const res = await request(app).get('/api/ready');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe('ready');
  });

  it('GET /api/ready returns 503 when SQLite is closed', async () => {
    closeSqlite();

    const res = await request(app).get('/api/ready');
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(res.body.status).toBe('not_ready');

    initializeSqlite();
  });

  it('Docker HEALTHCHECK probes readiness, not liveness', () => {
    const dockerfile = fs.readFileSync(path.resolve(process.cwd(), 'Dockerfile'), 'utf8');
    const compose = fs.readFileSync(path.resolve(process.cwd(), 'docker-compose.yml'), 'utf8');

    expect(dockerfile).toContain('/api/ready');
    expect(dockerfile).not.toMatch(/HEALTHCHECK[\s\S]*\/api\/health/);
    expect(compose).toContain('/api/ready');
    expect(compose).not.toMatch(/healthcheck:[\s\S]*\/api\/health/);
  });

  it('GET /api/health still succeeds when SQLite is closed', async () => {
    closeSqlite();

    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');

    initializeSqlite();
  });
});
