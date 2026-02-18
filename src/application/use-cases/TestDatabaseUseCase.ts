import { IDatabaseRepository } from '../../domain/repositories/IDatabaseRepository';

export class TestDatabaseUseCase {
  constructor(private databaseRepository: IDatabaseRepository) {}

  async execute(): Promise<{ database: string; time: string }> {
    try {
      const result = await this.databaseRepository.query('SELECT NOW()');
      return {
        database: 'connected',
        time: result.rows[0].now
      };
    } catch (error) {
      throw new Error('Database connection failed');
    }
  }
}
