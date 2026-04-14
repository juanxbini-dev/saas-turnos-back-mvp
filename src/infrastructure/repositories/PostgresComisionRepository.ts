import { pool } from '../database/postgres.connection';
import { IComisionRepository } from '../../domain/repositories/IComisionRepository';
import { ComisionTurno, CreateComisionData } from '../../domain/entities/Comision';
import { generarId } from '../../shared/utils/calculos.utils';

export class PostgresComisionRepository implements IComisionRepository {
  async create(data: CreateComisionData): Promise<ComisionTurno> {
    const query = `
      INSERT INTO comisiones_turno (
        id, turno_id, profesional_id, empresa_id,
        servicio_monto, servicio_comision_porcentaje, servicio_comision_monto, servicio_neto_profesional,
        estado, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pendiente', NOW(), NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [
      generarId(),
      data.turno_id, data.profesional_id, data.empresa_id,
      data.servicio_monto, data.servicio_comision_porcentaje,
      data.servicio_comision_monto, data.servicio_neto_profesional,
    ]);
    return result.rows[0];
  }

  async findByTurno(turnoId: string): Promise<ComisionTurno | null> {
    const result = await pool.query(`SELECT * FROM comisiones_turno WHERE turno_id = $1`, [turnoId]);
    return result.rows[0] || null;
  }

  async findByProfesional(profesionalId: string): Promise<ComisionTurno[]> {
    const result = await pool.query(
      `SELECT * FROM comisiones_turno WHERE profesional_id = $1 ORDER BY created_at DESC`,
      [profesionalId]
    );
    return result.rows;
  }

  async findByEmpresa(empresaId: string): Promise<ComisionTurno[]> {
    const result = await pool.query(
      `SELECT * FROM comisiones_turno WHERE empresa_id = $1 ORDER BY created_at DESC`,
      [empresaId]
    );
    return result.rows;
  }

  async updateByTurno(turnoId: string, data: Partial<CreateComisionData>): Promise<ComisionTurno> {
    const result = await pool.query(
      `UPDATE comisiones_turno
       SET servicio_monto = COALESCE($1, servicio_monto),
           servicio_comision_porcentaje = COALESCE($2, servicio_comision_porcentaje),
           servicio_comision_monto = COALESCE($3, servicio_comision_monto),
           servicio_neto_profesional = COALESCE($4, servicio_neto_profesional),
           updated_at = NOW()
       WHERE turno_id = $5 RETURNING *`,
      [
        data.servicio_monto,
        data.servicio_comision_porcentaje,
        data.servicio_comision_monto,
        data.servicio_neto_profesional,
        turnoId
      ]
    );
    return result.rows[0];
  }

  async updateEstado(id: string, estado: 'pendiente' | 'pagada' | 'cancelada'): Promise<ComisionTurno> {
    const result = await pool.query(
      `UPDATE comisiones_turno
       SET estado = $1,
           fecha_pago = CASE WHEN $1 = 'pagada' THEN NOW() ELSE fecha_pago END,
           updated_at = NOW()
       WHERE id = $2 RETURNING *`,
      [estado, id]
    );
    return result.rows[0];
  }
}
