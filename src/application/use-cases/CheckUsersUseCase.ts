import { IDatabaseRepository } from '../../domain/repositories/IDatabaseRepository';

export class CheckUsersUseCase {
  constructor(private databaseRepository: IDatabaseRepository) {}

  async execute(): Promise<any> {
    try {
      // Check if usuarios table exists
      const tableCheck = await this.databaseRepository.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'usuarios'
      `);

      if (tableCheck.rows.length === 0) {
        return { error: 'Tabla usuarios no existe' };
      }

      // Get table structure
      const structure = await this.databaseRepository.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'usuarios' 
        ORDER BY ordinal_position
      `);

      // Get sample records
      const records = await this.databaseRepository.query(`
        SELECT id, email, activo, empresa_id, roles, created_at
        FROM usuarios 
        LIMIT 5
      `);

      return {
        table: 'usuarios',
        structure: structure.rows,
        records: records.rows,
        totalRecords: records.rowCount
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Error desconocido' };
    }
  }
}
