import { IDatabaseRepository } from '../../domain/repositories/IDatabaseRepository';
import { pool } from '../database/postgres.connection';

export class PostgresDatabaseRepository implements IDatabaseRepository {
  async query(text: string, params?: any[]): Promise<any> {
    try {
      const result = await pool.query(text, params);
      return result;
    } catch (error) {
      console.error('Database query error:', error);
      throw error;
    }
  }
}
