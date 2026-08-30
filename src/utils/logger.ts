const FORBIDDEN_KEYS = new Set([
  'password',
  'password_hash',
  'authorization',
  'cookie',
  'body',
  'file',
  'contents',
]);

export type LogLevel = 'info' | 'warn' | 'error';

export type LogFields = {
  event: string;
  requestId?: string;
  method?: string;
  path?: string;
  status?: number;
  fileId?: string;
  size?: number;
  expiredDeleted?: number;
  orphanedDeleted?: number;
  signal?: string;
  message?: string;
};

const write = (level: LogLevel, line: string): void => {
  if (level === 'error') {
    console.error(line);
    return;
  }
  if (level === 'warn') {
    console.warn(line);
    return;
  }
  console.log(line);
};

export const serializeLog = (level: LogLevel, fields: LogFields): string => {
  const payload: Record<string, unknown> = {
    ts: new Date().toISOString(),
    level,
  };

  for (const [key, value] of Object.entries(fields)) {
    if (value === undefined || FORBIDDEN_KEYS.has(key.toLowerCase())) {
      continue;
    }
    payload[key] = typeof value === 'string' && value.length > 500 ? value.slice(0, 500) : value;
  }

  return JSON.stringify(payload);
};

export const log = (level: LogLevel, fields: LogFields): void => {
  write(level, serializeLog(level, fields));
};

export const requestContext = (req: { requestId?: string; method?: string; path?: string }) => ({
  requestId: req.requestId,
  method: req.method,
  path: req.path,
});
