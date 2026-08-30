import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { isOriginAllowed, resolveCorsOrigin } from '../config/cors.js';

describe('resolveCorsOrigin', () => {
  it('defaults to localhost Vite in non-production and same-origin in production', () => {
    expect(resolveCorsOrigin(undefined, 'development')).toBe('http://localhost:5173');
    expect(resolveCorsOrigin(undefined, 'test')).toBe('http://localhost:5173');
    expect(resolveCorsOrigin(undefined, 'production')).toBe(false);
  });

  it('parses explicit allowlists, wildcard, and false', () => {
    expect(resolveCorsOrigin('https://drop.example')).toBe('https://drop.example');
    expect(resolveCorsOrigin('https://a.example, https://b.example')).toEqual([
      'https://a.example',
      'https://b.example',
    ]);
    expect(resolveCorsOrigin('*')).toBe(true);
    expect(resolveCorsOrigin('false')).toBe(false);
    expect(isOriginAllowed('https://evil.example', 'http://localhost:5173')).toBe(false);
    expect(isOriginAllowed('http://localhost:5173', 'http://localhost:5173')).toBe(true);
  });
});

describe('Helmet and CORS', () => {
  it('sets X-Content-Type-Options and other Helmet protections', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['content-security-policy']).toMatch(/default-src 'self'/);
    expect(res.headers['referrer-policy']).toBe('no-referrer');
  });

  it('allows the development origin and exposes Content-Disposition', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://localhost:5173');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-expose-headers']?.toLowerCase()).toContain('content-disposition');
    expect(res.headers['access-control-expose-headers']?.toLowerCase()).toContain('x-request-id');
  });

  it('does not allow an unlisted origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'https://evil.example');

    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });
});
