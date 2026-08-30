import { describe, it, expect } from 'vitest';
import app from '../app.js';
import { parseTrustProxy } from '../config/trustProxy.js';

describe('Express Trust Proxy Configuration', () => {
  it('applies parseTrustProxy to the running Express app', () => {
    expect(app.get('trust proxy')).toBe(parseTrustProxy(process.env.TRUST_PROXY));
  });

  it('parses true, false, numeric hops, and subnet strings', () => {
    expect(parseTrustProxy(undefined)).toBe(1);
    expect(parseTrustProxy('true')).toBe(true);
    expect(parseTrustProxy('TRUE')).toBe(true);
    expect(parseTrustProxy('false')).toBe(false);
    expect(parseTrustProxy('2')).toBe(2);
    expect(parseTrustProxy('loopback')).toBe('loopback');
  });
});
