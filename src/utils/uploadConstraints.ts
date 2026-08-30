export const MIN_EXPIRY_MINUTES = 1;
export const MAX_EXPIRY_MINUTES = 10080;
export const MIN_MAX_DOWNLOADS = 1;
export const MAX_MAX_DOWNLOADS = 100;
export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'application/pdf': '.pdf',
  'text/plain': '.txt',
  'application/zip': '.zip',
};

export const ALLOWED_MIME_TYPES = Object.keys(MIME_EXTENSIONS);

export type ParseResult =
  | { ok: true; value: number }
  | { ok: false; message: string };

const isIntegerString = (raw: string): boolean => /^-?\d+$/.test(raw);

export const parseExpiryMinutes = (raw: unknown): ParseResult => {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: false, message: 'Invalid expiry time' };
  }

  const text = String(raw).trim();
  if (!isIntegerString(text)) {
    return { ok: false, message: 'Invalid expiry time' };
  }

  const value = Number(text);
  if (value < MIN_EXPIRY_MINUTES || value > MAX_EXPIRY_MINUTES) {
    return { ok: false, message: 'Invalid expiry time' };
  }

  return { ok: true, value };
};

export const parseMaxDownloads = (raw: unknown): ParseResult => {
  if (raw === undefined || raw === null || raw === '') {
    return { ok: true, value: 1 };
  }

  const text = String(raw).trim();
  if (!isIntegerString(text)) {
    return { ok: false, message: 'Invalid max downloads' };
  }

  const value = Number(text);
  if (value < MIN_MAX_DOWNLOADS || value > MAX_MAX_DOWNLOADS) {
    return { ok: false, message: 'Invalid max downloads' };
  }

  return { ok: true, value };
};

export const extensionForMime = (mimeType: string): string | null => {
  return MIME_EXTENSIONS[mimeType.toLowerCase().trim()] ?? null;
};
