import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';

export const requestStore = new AsyncLocalStorage<{ requestId: string; userId?: string }>();

const REDACTED_FIELDS = ['password', 'token', 'accessToken', 'refreshToken', 'authorization'];

const redact = winston.format((info) => {
  REDACTED_FIELDS.forEach((field) => {
    if ((info as any)[field]) (info as any)[field] = '[REDACTED]';
    if ((info as any).body?.[field]) (info as any).body[field] = '[REDACTED]';
  });
  return info;
});

const addRequestContext = winston.format((info) => {
  const store = requestStore.getStore();
  if (store?.requestId) (info as any).requestId = store.requestId;
  if (store?.userId) (info as any).userId = store.userId;
  return info;
});

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    redact(),
    addRequestContext(),
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'turnos-backend' },
  transports: [new winston.transports.Console()],
});

export const createLogger = (component: string) => ({
  debug: (message: string, meta?: any) =>
    logger.debug(message, { component, ...meta }),
  info: (message: string, meta?: any) =>
    logger.info(message, { component, ...meta }),
  warn: (message: string, meta?: any) =>
    logger.warn(message, { component, ...meta }),
  error: (message: string, error?: Error, meta?: any) =>
    logger.error(message, { error: error?.message, stack: error?.stack, component, ...meta }),
});
