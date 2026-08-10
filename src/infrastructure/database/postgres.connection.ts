import { Pool } from 'pg';
import { config } from '../../config/env';

const isProduction = process.env.NODE_ENV === 'production';

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password || '',
  database: config.database.name,
  ssl: isProduction ? { rejectUnauthorized: false } : false,
});

// Sin este handler, un reset de una conexión idle (mantenimiento/reinicio de la DB
// en Railway) emite 'error' sin listener y tumba el proceso entero (ECONNRESET).
pool.on('error', (error) => {
  console.error('Unexpected error on idle PostgreSQL client:', error);
});

export const connectDatabase = async (): Promise<void> => {
  try {
    const client = await pool.connect();
    client.release();
    console.log('Database connected');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

export { pool };
