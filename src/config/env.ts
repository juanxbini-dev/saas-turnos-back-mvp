import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 4000,
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433'),
    user: process.env.DB_USER || 'turnos_user',
    password: process.env.DB_PASSWORD || '',
    name: process.env.DB_NAME || 'turnos_db'
  },
  jwtSecret: process.env.JWT_SECRET || 'default_secret',
  refreshToken: {
    secret: process.env.REFRESH_TOKEN_SECRET || process.env.JWT_SECRET || 'default_secret',
    days: parseInt(process.env.REFRESH_TOKEN_DAYS || '7')
  },
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || ''
  }
};
