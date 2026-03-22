import { pool } from '../database/postgres.connection';
import { IBloqueoSlotRepository } from '../../domain/repositories/IBloqueoSlotRepository';
import { BloqueoSlot, CreateBloqueoSlotData } from '../../domain/entities/BloqueoSlot';

export class PostgresBloqueoSlotRepository implements IBloqueoSlotRepository {
  async findByProfesionalAndFecha(profesionalId: string, fecha: string): Promise<BloqueoSlot[]> {
    const query = `
      SELECT id, empresa_id, profesional_id, fecha, hora_inicio, hora_fin, motivo, created_at
      FROM bloqueos_slots
      WHERE profesional_id = $1 AND fecha = $2
      ORDER BY hora_inicio ASC
    `;
    const result = await pool.query(query, [profesionalId, fecha]);
    return result.rows;
  }

  async findByProfesionalAndRango(profesionalId: string, fechaInicio: string, fechaFin: string): Promise<BloqueoSlot[]> {
    const query = `
      SELECT id, empresa_id, profesional_id, fecha, hora_inicio, hora_fin, motivo, created_at
      FROM bloqueos_slots
      WHERE profesional_id = $1 AND fecha BETWEEN $2 AND $3
      ORDER BY fecha ASC, hora_inicio ASC
    `;
    const result = await pool.query(query, [profesionalId, fechaInicio, fechaFin]);
    return result.rows;
  }

  async create(data: CreateBloqueoSlotData): Promise<BloqueoSlot> {
    const query = `
      INSERT INTO bloqueos_slots (id, empresa_id, profesional_id, fecha, hora_inicio, hora_fin, motivo, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING id, empresa_id, profesional_id, fecha, hora_inicio, hora_fin, motivo, created_at
    `;
    const result = await pool.query(query, [
      data.id,
      data.empresa_id,
      data.profesional_id,
      data.fecha,
      data.hora_inicio,
      data.hora_fin,
      data.motivo ?? null
    ]);
    return result.rows[0];
  }

  async delete(id: string, profesionalId: string): Promise<void> {
    const query = `DELETE FROM bloqueos_slots WHERE id = $1 AND profesional_id = $2`;
    const result = await pool.query(query, [id, profesionalId]);
    if (result.rowCount === 0) {
      throw Object.assign(new Error('Bloqueo no encontrado'), { statusCode: 404 });
    }
  }
}
