import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'turnos-backend' },
  transports: [
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    new winston.transports.File({ 
      filename: 'logs/combined.log',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

// Consola siempre activa — en Railway los archivos son efímeros e invisibles
logger.add(new winston.transports.Console({
  format: process.env.NODE_ENV === 'production'
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(winston.format.colorize(), winston.format.simple())
}));

// Create component-specific logger
export const createLogger = (component: string) => ({
  debug: (message: string, meta?: any) => 
    logger.debug(message, { component, ...meta }),
  
  info: (message: string, meta?: any) => 
    logger.info(message, { component, ...meta }),
  
  warn: (message: string, meta?: any) => 
    logger.warn(message, { component, ...meta }),
  
  error: (message: string, error?: Error, meta?: any) => 
    logger.error(message, { error: error?.message, stack: error?.stack, component, ...meta })
});
