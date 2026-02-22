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
    return result.rows;
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
    return result.rows;
  }

  async findByFechaYProfesional(profesionalId: string, fecha: string): Promise<Turno[]> {
    const query = `
      SELECT id, cliente_id, usuario_id, servicio_id, fecha, hora, 
             estado, notas, servicio, servicio_precio, duracion, 
             empresa_id, created_at, updated_at
      FROM turnos
      WHERE usuario_id = $1 AND fecha = $2
      ORDER BY hora ASC
    `;
    
    const result = await pool.query(query, [profesionalId, fecha]);
    return result.rows;
  }

  async create(data: CreateTurnoData): Promise<Turno> {
    const query = `
      INSERT INTO turnos (
        id, cliente_id, usuario_id, servicio_id, fecha, hora, estado, 
        notas, servicio, servicio_precio, duracion, empresa_id, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, 'pendiente', $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING id, cliente_id, usuario_id, servicio_id, fecha, hora, estado, 
                notas, servicio, servicio_precio, duracion, empresa_id, created_at, updated_at
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
                notas, servicio, precio, duracion_minutos, empresa_id, created_at, updated_at
    `;
    
    const result = await pool.query(query, [estado, id]);
    return result.rows[0];
  }

  async completarVencidos(): Promise<number> {
    const query = `
      UPDATE turnos 
      SET estado = 'completado', updated_at = NOW()
      WHERE estado = 'confirmado' AND (fecha::date + hora::time) < NOW()
      RETURNING id
    `;
    
    const result = await pool.query(query);
    return result.rowCount || 0;
  }
}
