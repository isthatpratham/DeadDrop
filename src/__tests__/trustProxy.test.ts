import { describe, it, expect } from 'vitest';
import app from '../app.js';

describe('Express Trust Proxy Configuration', () => {
  it('should have trust proxy configured on Express app', () => {
    const trustProxySetting = app.get('trust proxy');
    expect(trustProxySetting).toBeDefined();
    expect(trustProxySetting).not.toBe(false);
  });
});
