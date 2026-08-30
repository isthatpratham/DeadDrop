import rateLimit, { type Options } from 'express-rate-limit';

const parsePositiveInt = (raw: string | undefined, fallback: number): number => {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : fallback;
};

const jsonExceededHandler: Options['handler'] = (req, res, _next, options) => {
  res.status(options.statusCode).json({ success: false, message: 'Too many requests' });
};

export const createRateLimiter = (windowMs: number, max: number) =>
  rateLimit({
    windowMs,
    limit: max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: jsonExceededHandler,
  });

export const createApiRateLimiter = () =>
  createRateLimiter(
    parsePositiveInt(process.env.RATE_LIMIT_API_WINDOW_MS, 15 * 60 * 1000),
    parsePositiveInt(process.env.RATE_LIMIT_API_MAX, 100)
  );

export const createUploadRateLimiter = () =>
  createRateLimiter(
    parsePositiveInt(process.env.RATE_LIMIT_UPLOAD_WINDOW_MS, 60 * 60 * 1000),
    parsePositiveInt(process.env.RATE_LIMIT_UPLOAD_MAX, 20)
  );

export const createDownloadRateLimiter = () =>
  createRateLimiter(
    parsePositiveInt(process.env.RATE_LIMIT_DOWNLOAD_WINDOW_MS, 15 * 60 * 1000),
    parsePositiveInt(process.env.RATE_LIMIT_DOWNLOAD_MAX, 10)
  );
