import { pool } from '../database/postgres.connection';
import { IConfiguracionProductosRepository } from '../../domain/repositories/IConfiguracionProductosRepository';
import { ConfiguracionProductos, UpdateConfiguracionProductosData } from '../../domain/entities/ConfiguracionProductos';

export class PostgresConfiguracionProductosRepository implements IConfiguracionProductosRepository {
  async findByEmpresa(empresaId: string): Promise<ConfiguracionProductos | null> {
    const result = await pool.query(
      `SELECT * FROM configuracion_productos WHERE empresa_id = $1`,
      [empresaId]
    );
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async upsert(empresaId: string, data: UpdateConfiguracionProductosData): Promise<ConfiguracionProductos> {
    const result = await pool.query(
      `INSERT INTO configuracion_productos (empresa_id, pct_efectivo, pct_transferencia, pct_tarjeta, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (empresa_id) DO UPDATE SET
         pct_efectivo = EXCLUDED.pct_efectivo,
         pct_transferencia = EXCLUDED.pct_transferencia,
         pct_tarjeta = EXCLUDED.pct_tarjeta,
         updated_at = NOW()
       RETURNING *`,
      [empresaId, data.pct_efectivo, data.pct_transferencia, data.pct_tarjeta]
    );
    return this.mapRow(result.rows[0]);
  }

  // node-pg devuelve NUMERIC como string
  private mapRow(row: any): ConfiguracionProductos {
    return {
      ...row,
      pct_efectivo: Number(row.pct_efectivo),
      pct_transferencia: Number(row.pct_transferencia),
      pct_tarjeta: Number(row.pct_tarjeta),
    };
  }
}
