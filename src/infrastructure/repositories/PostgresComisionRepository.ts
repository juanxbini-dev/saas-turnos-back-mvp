import { pool } from '../database/postgres.connection';
import { IComisionRepository } from '../../domain/repositories/IComisionRepository';
import { ComisionProfesional, CreateComisionData } from '../../domain/entities/Comision';
import { generarId } from '../../shared/utils/calculos.utils';

export class PostgresComisionRepository implements IComisionRepository {
  async create(data: CreateComisionData): Promise<ComisionProfesional> {
    const query = `
      INSERT INTO comisiones_profesionales (
        id, turno_id, profesional_id, empresa_id,
        servicio_monto, servicio_comision_porcentaje, servicio_comision_monto, servicio_neto_profesional,
        productos_monto, productos_comision_porcentaje, productos_comision_monto, productos_neto_profesional,
        total_venta, total_comision_empresa, total_neto_profesional,
        estado, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'pendiente', NOW(), NOW())
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      generarId(),
      data.turno_id,
      data.profesional_id,
      data.empresa_id,
      data.servicio_monto,
      data.servicio_comision_porcentaje,
      data.servicio_comision_monto,
      data.servicio_neto_profesional,
      data.productos_monto,
      data.productos_comision_porcentaje,
      data.productos_comision_monto,
      data.productos_neto_profesional,
      data.total_venta,
      data.total_comision_empresa,
      data.total_neto_profesional
    ]);
    
    return result.rows[0];
  }

  async findByTurno(turnoId: string): Promise<ComisionProfesional | null> {
    const query = `
      SELECT * FROM comisiones_profesionales 
      WHERE turno_id = $1
    `;
    
    const result = await pool.query(query, [turnoId]);
    return result.rows[0] || null;
  }

  async findByProfesional(profesionalId: string): Promise<ComisionProfesional[]> {
    const query = `
      SELECT * FROM comisiones_profesionales 
      WHERE profesional_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [profesionalId]);
    return result.rows;
  }

  async findByEmpresa(empresaId: string): Promise<ComisionProfesional[]> {
    const query = `
      SELECT * FROM comisiones_profesionales 
      WHERE empresa_id = $1
      ORDER BY created_at DESC
    `;
    
    const result = await pool.query(query, [empresaId]);
    return result.rows;
  }

  async updateEstado(id: string, estado: 'pendiente' | 'pagada' | 'cancelada'): Promise<ComisionProfesional> {
    const query = `
      UPDATE comisiones_profesionales
      SET estado = $1, 
          fecha_pago = CASE WHEN $1 = 'pagada' THEN NOW() ELSE fecha_pago END,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `;
    
    const result = await pool.query(query, [estado, id]);
    return result.rows[0];
  }
}
