import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';
const MAX_REQUEST_ID_LENGTH = 128;
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

export const resolveRequestId = (incoming: string | undefined): string => {
  const candidate = (incoming ?? '').trim();
  if (candidate.length > 0 && candidate.length <= MAX_REQUEST_ID_LENGTH && SAFE_REQUEST_ID.test(candidate)) {
    return candidate;
  }
  return randomUUID();
};

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = resolveRequestId(req.header('X-Request-Id'));
  req.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  next();
};
