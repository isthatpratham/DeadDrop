import { describe, expect, it } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('API error responses', () => {
  it('returns JSON 404 for an unknown API route', async () => {
    const res = await request(app).get('/api/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toEqual({ success: false, message: 'Not found' });
    expect(res.text).not.toMatch(/<!DOCTYPE|Cannot GET/i);
  });

  it('returns JSON 404 for an unknown API POST', async () => {
    const res = await request(app).post('/api/does-not-exist').send({ hello: 'world' });

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toEqual({ success: false, message: 'Not found' });
  });

  it('returns JSON 400 for invalid JSON and does not echo the body', async () => {
    const res = await request(app)
      .post('/api/download/11111111-1111-4111-8111-111111111111')
      .set('Content-Type', 'application/json')
      .send('{"password":');

    expect(res.status).toBe(400);
    expect(res.headers['content-type']).toMatch(/json/);
    expect(res.body).toEqual({ success: false, message: 'Invalid JSON' });
    expect(JSON.stringify(res.body)).not.toContain('password');
    expect(res.text).not.toMatch(/SyntaxError|Unexpected token|stack/i);
  });
});
