import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { requestStore } from '../../utils/logger';

export const requestIdMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const requestId = (req.headers['x-request-id'] as string) || randomUUID();
  (req as any).id = requestId;
  res.setHeader('X-Request-Id', requestId);
  requestStore.run({ requestId }, () => next());
};
