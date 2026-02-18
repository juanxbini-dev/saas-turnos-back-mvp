import { Pool } from 'pg';
import { config } from '../../config/env';

const pool = new Pool({
  host: config.database.host,
  port: config.database.port,
  user: config.database.user,
  password: config.database.password || '',
  database: config.database.name,
});

export const connectDatabase = async (): Promise<void> => {
  try {
    await pool.connect();
    console.log('Database connected');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

export { pool };
