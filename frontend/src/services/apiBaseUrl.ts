export function resolveApiBaseUrl(configured?: string): string {
  const value = configured?.trim();
  if (!value) {
    return '/api';
  }

  return value.replace(/\/+$/, '');
}
