import { pool } from '../database/postgres.connection';
import { ITurnoRepository, CreateTurnoData } from '../../domain/repositories/ITurnoRepository';
import { Turno, TurnoConDetalle } from '../../domain/entities/Turno';

export class PostgresTurnoRepository implements ITurnoRepository {
  async findByEmpresa(empresaId: string): Promise<TurnoConDetalle[]> {
    const query = `
      SELECT 
        t.id, t.cliente_id, t.usuario_id, t.servicio_id, t.fecha, t.hora, 
        t.estado, t.notas, t.servicio, t.servicio_precio, t.duracion, 
        t.empresa_id, t.created_at, t.updated_at,
        c.nombre as cliente_nombre, c.email as cliente_email,
        u.nombre as usuario_nombre, u.username as usuario_username
      FROM turnos t
      LEFT JOIN clientes c ON t.cliente_id = c.id
      LEFT JOIN usuarios u ON t.usuario_id = u.id
      WHERE t.empresa_id = $1
      ORDER BY t.fecha DESC, t.hora DESC
    `;
    
    const result = await pool.query(query, [empresaId]);
    
    // Mapear duracion a duracion_minutos para que coincida con la entidad
    return result.rows.map(row => ({
      ...row,
      duracion_minutos: row.duracion,
      precio: row.servicio_precio
    }));
  }

  async findByProfesional(profesionalId: string): Promise<TurnoConDetalle[]> {
    const query = `
      SELECT 
        t.id, t.cliente_id, t.usuario_id, t.servicio_id, t.fecha, t.hora, 
        t.estado, t.notas, t.servicio, t.servicio_precio, t.duracion, 
        t.empresa_id, t.created_at, t.updated_at,
        c.nombre as cliente_nombre, c.email as cliente_email,
        u.nombre as usuario_nombre, u.username as usuario_username
      FROM turnos t
      LEFT JOIN clientes c ON t.cliente_id = c.id
      LEFT JOIN usuarios u ON t.usuario_id = u.id
      WHERE t.usuario_id = $1
      ORDER BY t.fecha DESC, t.hora DESC
    `;
    
    const result = await pool.query(query, [profesionalId]);
    
    // Mapear duracion a duracion_minutos para que coincida con la entidad
    return result.rows.map(row => ({
      ...row,
      duracion_minutos: row.duracion,
      precio: row.servicio_precio
    }));
  }

  async findByFechaYProfesional(profesionalId: string, fecha: string): Promise<Turno[]> {
    const query = `
      SELECT id, cliente_id, usuario_id, servicio_id, fecha, hora, 
             estado, notas, servicio, servicio_precio as precio, duracion as duracion_minutos, 
             empresa_id, created_at, updated_at
      FROM turnos
      WHERE usuario_id = $1 AND fecha = $2
      ORDER BY hora ASC
    `;
    
    const result = await pool.query(query, [profesionalId, fecha]);
    return result.rows;
  }

  async findByProfesionalEnRango(
    profesionalId: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<TurnoConDetalle[]> {
    const query = `
      SELECT 
        t.id, t.cliente_id, t.usuario_id, t.servicio_id, 
        TO_CHAR(t.fecha::date, 'YYYY-MM-DD') as fecha, 
        TO_CHAR(t.hora::time, 'HH24:MI') as hora,
        t.estado, t.notas, t.servicio, t.servicio_precio, t.duracion, 
        t.empresa_id, t.created_at, t.updated_at,
        c.nombre as cliente_nombre, c.email as cliente_email,
        u.nombre as usuario_nombre, u.username as usuario_username
      FROM turnos t
      JOIN clientes c ON t.cliente_id = c.id
      JOIN usuarios u ON t.usuario_id = u.id
      WHERE t.usuario_id = $1
      AND t.fecha >= $2
      AND t.fecha <= $3
      AND t.estado IN ('pendiente', 'confirmado', 'completado')
      ORDER BY t.fecha ASC, t.hora ASC
    `;
    
    const result = await pool.query(query, [profesionalId, fechaInicio, fechaFin]);
    
    // Mapear duracion a duracion_minutos para que coincida con la entidad
    return result.rows.map(row => ({
      ...row,
      duracion_minutos: row.duracion,
      precio: row.servicio_precio
    }));
  }

  async create(data: CreateTurnoData): Promise<Turno> {
    const query = `
      INSERT INTO turnos (
        id, cliente_id, usuario_id, servicio_id, fecha, hora, estado, 
        notas, servicio, servicio_precio, duracion, empresa_id, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pendiente', $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING id, cliente_id, usuario_id, servicio_id, fecha, hora, estado, 
                notas, servicio, servicio_precio as precio, duracion as duracion_minutos, 
                empresa_id, created_at, updated_at
    `;
    
    const result = await pool.query(query, [
      data.id,
      data.cliente_id,
      data.usuario_id,
      data.servicio_id,
      data.fecha,
      data.hora,
      data.notas || null,
      data.servicio,
      data.precio,
      data.duracion_minutos,
      data.empresa_id
    ]);
    
    return result.rows[0];
  }

  async updateEstado(id: string, estado: 'pendiente' | 'confirmado' | 'completado' | 'cancelado'): Promise<Turno> {
    const query = `
      UPDATE turnos
      SET estado = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, cliente_id, usuario_id, servicio_id, fecha, hora, estado, 
                notas, servicio, servicio_precio as precio, duracion as duracion_minutos, 
                empresa_id, created_at, updated_at
    `;
    
    const result = await pool.query(query, [estado, id]);
    return result.rows[0];
  }

  async completarVencidos(): Promise<number> {
    const query = `
      UPDATE turnos 
      SET estado = 'completado', updated_at = NOW()
      WHERE estado = 'confirmado' 
        AND (fecha::date + hora::time + INTERVAL '45 minutes') < NOW() AT TIME ZONE 'America/Argentina/Buenos_Aires'
      RETURNING id
    `;
    
    const result = await pool.query(query);
    return result.rowCount || 0;
  }
}
