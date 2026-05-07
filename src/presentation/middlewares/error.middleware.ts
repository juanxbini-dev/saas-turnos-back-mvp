import { Request, Response, NextFunction } from 'express';
import { logger } from '../../utils/logger';
import { pool } from '../../infrastructure/database/postgres.connection';

export interface CustomError extends Error {
  statusCode?: number;
}

export const errorHandler = (
  error: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  const requestId = (req as any).id as string | undefined;

  if (statusCode >= 500) {
    logger.error('unhandled_error', {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      message,
      stack: error.stack,
    });
    insertErrorLog({ requestId, req, statusCode, message, stack: error.stack }).catch(() => {});
  } else {
    logger.warn('client_error', {
      method: req.method,
      url: req.originalUrl,
      statusCode,
      message,
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    requestId,
  });
};

export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

async function insertErrorLog(data: {
  requestId?: string;
  req: Request;
  statusCode: number;
  message: string;
  stack?: string;
}): Promise<void> {
  const userId = (data.req as any).user?.id ?? null;
  const empresaId = (data.req as any).user?.empresa_id ?? null;
  await pool.query(
    `INSERT INTO error_logs
       (request_id, user_id, empresa_id, method, route, status_code, message, stack, user_agent)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      data.requestId ?? null,
      userId,
      empresaId,
      data.req.method,
      data.req.originalUrl,
      data.statusCode,
      data.message,
      data.stack ?? null,
      data.req.headers['user-agent'] ?? null,
    ]
  );
}
