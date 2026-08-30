import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import app from '../app.js';
import { resolveRequestId } from '../middleware/requestId.js';
import { serializeLog } from '../utils/logger.js';

describe('request IDs', () => {
  it('generates an X-Request-Id when the client does not send one', async () => {
    const res = await request(app).get('/api/health');
    expect(res.headers['x-request-id']).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it('preserves an incoming X-Request-Id', async () => {
    const res = await request(app).get('/api/health').set('X-Request-Id', 'client-trace-123');
    expect(res.headers['x-request-id']).toBe('client-trace-123');
  });

  it('strips newlines from an incoming request id', () => {
    expect(resolveRequestId('abc\n{"injected":true}')).toBe('abc{"injected":true}');
  });
});

describe('structured logger', () => {
  it('writes JSON and drops password fields', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const line = serializeLog('info', {
      event: 'upload_success',
      fileId: 'file-1',
      password: 'secret',
    } as never);

    const payload = JSON.parse(line) as Record<string, unknown>;
    expect(payload.event).toBe('upload_success');
    expect(payload.fileId).toBe('file-1');
    expect(payload.password).toBeUndefined();
    expect(payload.level).toBe('info');
    expect(typeof payload.ts).toBe('string');
    spy.mockRestore();
  });
});
