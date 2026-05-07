import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/env';
import { errorHandler } from './presentation/middlewares/error.middleware';
import { requestIdMiddleware } from './presentation/middlewares/requestId.middleware';
import { logger } from './utils/logger';
import routes from './presentation/routes';

const app = express();

// Middlewares
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : ['http://localhost:5173', 'http://localhost:5174'];

app.use(requestIdMiddleware);
app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request', {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - start,
      ip: req.ip,
    });
  });
  next();
});
app.use(express.json());
app.use(cookieParser());

// Routes
app.use('/', routes);

// Error handling
app.use(errorHandler);

export default app;
