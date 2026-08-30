import { describe, it, expect } from 'vitest';
import { resolveApiBaseUrl } from '../../frontend/src/services/apiBaseUrl.ts';

describe('resolveApiBaseUrl', () => {
  it('defaults to same-origin /api when no override is set', () => {
    expect(resolveApiBaseUrl()).toBe('/api');
    expect(resolveApiBaseUrl('')).toBe('/api');
    expect(resolveApiBaseUrl('   ')).toBe('/api');
  });

  it('uses VITE_API_BASE_URL for split-origin deployments', () => {
    expect(resolveApiBaseUrl('https://files.example.com/api')).toBe('https://files.example.com/api');
  });

  it('strips trailing slashes from a configured base URL', () => {
    expect(resolveApiBaseUrl('https://files.example.com/api/')).toBe('https://files.example.com/api');
  });
});
