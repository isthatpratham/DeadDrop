export type CorsOriginSetting = boolean | string | string[];

export const isOriginAllowed = (requestOrigin: string | undefined, allowed: CorsOriginSetting): boolean => {
  if (allowed === true) {
    return true;
  }
  if (allowed === false || !requestOrigin) {
    return false;
  }
  const list = Array.isArray(allowed) ? allowed : [allowed];
  return list.includes(requestOrigin);
};

export const resolveCorsOrigin = (
  raw: string | undefined,
  nodeEnv: string | undefined = process.env.NODE_ENV
): CorsOriginSetting => {
  if (raw === undefined || raw.trim() === '') {
    return nodeEnv === 'production' ? false : 'http://localhost:5173';
  }

  const value = raw.trim();
  if (value === 'false') {
    return false;
  }
  if (value === '*') {
    return true;
  }

  const origins = value.split(',').map((origin) => origin.trim()).filter(Boolean);
  if (origins.length === 0) {
    return false;
  }
  return origins.length === 1 ? origins[0] : origins;
};
