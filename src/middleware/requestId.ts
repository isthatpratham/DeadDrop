import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';
const MAX_REQUEST_ID_LENGTH = 128;

export const resolveRequestId = (incoming: string | undefined): string => {
  const sanitized = (incoming ?? '').trim().replace(/[\r\n\t]/g, '').slice(0, MAX_REQUEST_ID_LENGTH);
  return sanitized.length > 0 ? sanitized : randomUUID();
};

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = resolveRequestId(req.header('X-Request-Id'));
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};
