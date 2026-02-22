import { pool } from '../database/postgres.connection';
import { 
  IDisponibilidadRepository, 
  CreateDisponibilidadData,
  UpdateDisponibilidadData,
  CreateVacacionData,
  UpdateVacacionData,
  CreateExcepcionData,
  UpdateExcepcionData
} from '../../domain/repositories/IDisponibilidadRepository';
import { DisponibilidadSemanal, DiasVacacion, ExcepcionDia } from '../../domain/entities/Disponibilidad';

export class PostgresDisponibilidadRepository implements IDisponibilidadRepository {
  // Disponibilidad semanal
  async findDisponibilidadByProfesional(profesionalId: string): Promise<DisponibilidadSemanal[]> {
    const query = `
      SELECT id, profesional_id, dia_inicio, dia_fin, hora_inicio, hora_fin, 
             intervalo_minutos, activo, created_at, updated_at
      FROM disponibilidad_semanal
      WHERE profesional_id = $1
      ORDER BY dia_inicio ASC
    `;
    
    const result = await pool.query(query, [profesionalId]);
    return result.rows;
  }

  async createDisponibilidad(data: CreateDisponibilidadData): Promise<DisponibilidadSemanal> {
    const query = `
      INSERT INTO disponibilidad_semanal (
        id, profesional_id, dia_inicio, dia_fin, hora_inicio, hora_fin, 
        intervalo_minutos, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, profesional_id, dia_inicio, dia_fin, hora_inicio, hora_fin, 
                intervalo_minutos, activo, created_at, updated_at
    `;
    
    const result = await pool.query(query, [
      data.id,
      data.profesional_id,
      data.dia_inicio,
      data.dia_fin,
      data.hora_inicio,
      data.hora_fin,
      data.intervalo_minutos
    ]);
    
    return result.rows[0];
  }

  async updateDisponibilidad(id: string, data: UpdateDisponibilidadData): Promise<DisponibilidadSemanal> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.dia_inicio !== undefined) {
      fields.push(`dia_inicio = $${paramIndex++}`);
      values.push(data.dia_inicio);
    }

    if (data.dia_fin !== undefined) {
      fields.push(`dia_fin = $${paramIndex++}`);
      values.push(data.dia_fin);
    }

    if (data.hora_inicio !== undefined) {
      fields.push(`hora_inicio = $${paramIndex++}`);
      values.push(data.hora_inicio);
    }

    if (data.hora_fin !== undefined) {
      fields.push(`hora_fin = $${paramIndex++}`);
      values.push(data.hora_fin);
    }

    if (data.intervalo_minutos !== undefined) {
      fields.push(`intervalo_minutos = $${paramIndex++}`);
      values.push(data.intervalo_minutos);
    }

    if (data.activo !== undefined) {
      fields.push(`activo = $${paramIndex++}`);
      values.push(data.activo);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE disponibilidad_semanal
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, profesional_id, dia_inicio, dia_fin, hora_inicio, hora_fin, 
                intervalo_minutos, activo, created_at, updated_at
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async deleteDisponibilidad(id: string): Promise<void> {
    const query = 'DELETE FROM disponibilidad_semanal WHERE id = $1';
    await pool.query(query, [id]);
  }

  // Vacaciones
  async findVacacionesByProfesional(profesionalId: string): Promise<DiasVacacion[]> {
    const query = `
      SELECT id, profesional_id, fecha, fecha_fin, tipo, motivo, 
             activo, created_at, updated_at
      FROM dias_vacacion
      WHERE profesional_id = $1
      ORDER BY fecha ASC
    `;
    
    const result = await pool.query(query, [profesionalId]);
    return result.rows;
  }

  async createVacacion(data: CreateVacacionData): Promise<DiasVacacion> {
    const query = `
      INSERT INTO dias_vacacion (
        id, profesional_id, fecha, fecha_fin, tipo, motivo, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, profesional_id, fecha, fecha_fin, tipo, motivo, 
                activo, created_at, updated_at
    `;
    
    const result = await pool.query(query, [
      data.id,
      data.profesional_id,
      data.fecha,
      data.fecha_fin || null,
      data.tipo,
      data.motivo || null
    ]);
    
    return result.rows[0];
  }

  async updateVacacion(id: string, data: UpdateVacacionData): Promise<DiasVacacion> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.fecha !== undefined) {
      fields.push(`fecha = $${paramIndex++}`);
      values.push(data.fecha);
    }

    if (data.fecha_fin !== undefined) {
      fields.push(`fecha_fin = $${paramIndex++}`);
      values.push(data.fecha_fin);
    }

    if (data.tipo !== undefined) {
      fields.push(`tipo = $${paramIndex++}`);
      values.push(data.tipo);
    }

    if (data.motivo !== undefined) {
      fields.push(`motivo = $${paramIndex++}`);
      values.push(data.motivo);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE dias_vacacion
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, profesional_id, fecha, fecha_fin, tipo, motivo, 
                activo, created_at, updated_at
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async deleteVacacion(id: string): Promise<void> {
    const query = 'DELETE FROM dias_vacacion WHERE id = $1';
    await pool.query(query, [id]);
  }

  // Excepciones
  async findExcepcionesByProfesional(profesionalId: string): Promise<ExcepcionDia[]> {
    const query = `
      SELECT id, profesional_id, fecha, disponible, hora_inicio, hora_fin, 
             intervalo_minutos, notas, created_at, updated_at
      FROM excepciones_dia
      WHERE profesional_id = $1
      ORDER BY fecha ASC
    `;
    
    const result = await pool.query(query, [profesionalId]);
    return result.rows;
  }

  async createExcepcion(data: CreateExcepcionData): Promise<ExcepcionDia> {
    const query = `
      INSERT INTO excepciones_dia (
        id, profesional_id, fecha, disponible, hora_inicio, hora_fin, 
        intervalo_minutos, notas, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, profesional_id, fecha, disponible, hora_inicio, hora_fin, 
                intervalo_minutos, notas, created_at, updated_at
    `;
    
    const result = await pool.query(query, [
      data.id,
      data.profesional_id,
      data.fecha,
      data.disponible,
      data.hora_inicio || null,
      data.hora_fin || null,
      data.intervalo_minutos || null,
      data.notas || null
    ]);
    
    return result.rows[0];
  }

  async updateExcepcion(id: string, data: UpdateExcepcionData): Promise<ExcepcionDia> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.fecha !== undefined) {
      fields.push(`fecha = $${paramIndex++}`);
      values.push(data.fecha);
    }

    if (data.disponible !== undefined) {
      fields.push(`disponible = $${paramIndex++}`);
      values.push(data.disponible);
    }

    if (data.hora_inicio !== undefined) {
      fields.push(`hora_inicio = $${paramIndex++}`);
      values.push(data.hora_inicio);
    }

    if (data.hora_fin !== undefined) {
      fields.push(`hora_fin = $${paramIndex++}`);
      values.push(data.hora_fin);
    }

    if (data.intervalo_minutos !== undefined) {
      fields.push(`intervalo_minutos = $${paramIndex++}`);
      values.push(data.intervalo_minutos);
    }

    if (data.notas !== undefined) {
      fields.push(`notas = $${paramIndex++}`);
      values.push(data.notas);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE excepciones_dia
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, profesional_id, fecha, disponible, hora_inicio, hora_fin, 
                intervalo_minutos, notas, created_at, updated_at
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async deleteExcepcion(id: string): Promise<void> {
    const query = 'DELETE FROM excepciones_dia WHERE id = $1';
    await pool.query(query, [id]);
  }
}
