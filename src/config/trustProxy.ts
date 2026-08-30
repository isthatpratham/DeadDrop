export type TrustProxySetting = boolean | number | string;

export const parseTrustProxy = (raw: string | undefined): TrustProxySetting => {
  if (raw === undefined || raw === '') {
    return 1;
  }

  const normalized = raw.toLowerCase();
  if (normalized === 'true') {
    return true;
  }
  if (normalized === 'false') {
    return false;
  }

  if (!Number.isNaN(Number(raw)) && raw.trim() !== '') {
    return Number(raw);
  }

  return raw;
};
