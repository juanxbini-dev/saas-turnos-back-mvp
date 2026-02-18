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
  }
};
