import { pool } from '../database/postgres.connection';
import { IUsuarioServicioRepository, CreateUsuarioServicioData, UpdateUsuarioServicioData } from '../../domain/repositories/IUsuarioServicioRepository';
import { UsuarioServicio } from '../../domain/entities/Servicio';

import { createLogger } from '../../utils/logger';

const serviciosLogger = createLogger('PostgresUsuarioServicioRepository');

export class PostgresUsuarioServicioRepository implements IUsuarioServicioRepository {
  async findByUsuario(usuarioId: string): Promise<UsuarioServicio[]> {
    const query = `
      SELECT us.id, us.usuario_id, us.servicio_id, us.empresa_id, us.precio_personalizado,
             us.duracion_personalizada, us.habilitado, us.nivel_habilidad, us.notas,
             us.created_at, us.updated_at,
             s.nombre, s.descripcion, s.precio_base, s.precio_minimo, s.precio_maximo, s.duracion, s.activo
      FROM usuario_servicios us
      INNER JOIN servicios s ON us.servicio_id = s.id
      WHERE us.usuario_id = $1 AND us.habilitado = true AND s.activo = true
      ORDER BY s.nombre ASC
    `;
    
    const result = await pool.query(query, [usuarioId]);
    
    serviciosLogger.debug('Servicios obtenidos para usuario', {
      usuarioId,
      cantidad: result.rows.length
    });
    
    // Convertir campos numéricos de string a number y mapear nombres correctos
    return result.rows.map(row => ({
      ...row,
      // Campos procesados para frontend
      precio: parseFloat(row.precio_personalizado || row.precio_base || '0'),
      duracion_minutos: parseInt(row.duracion_personalizada || row.duracion || '0'),
      // Campos de validación del servicio base
      precio_base: parseFloat(row.precio_base || '0'),
      precio_minimo: row.precio_minimo ? parseFloat(row.precio_minimo) : null,
      precio_maximo: row.precio_maximo ? parseFloat(row.precio_maximo) : null
    }));
  }

  async findByServicio(servicioId: string): Promise<UsuarioServicio[]> {
    const query = `
      SELECT us.id, us.usuario_id, us.servicio_id, us.empresa_id, us.precio_personalizado,
             us.duracion_personalizada, us.habilitado, us.nivel_habilidad, us.notas,
             us.created_at, us.updated_at,
             s.nombre, s.descripcion, s.precio_base, s.precio_minimo, s.precio_maximo, s.duracion, s.activo
      FROM usuario_servicios us
      INNER JOIN servicios s ON us.servicio_id = s.id
      WHERE us.servicio_id = $1 AND us.habilitado = true AND s.activo = true
      ORDER BY us.created_at DESC
    `;
    
    const result = await pool.query(query, [servicioId]);
    
    serviciosLogger.debug('Servicios obtenidos por servicio', {
      servicioId,
      cantidad: result.rows.length
    });
    
    // Convertir campos numéricos de string a number y mapear nombres correctos
    return result.rows.map(row => ({
      ...row,
      precio: parseFloat(row.precio_personalizado || row.precio_base || '0'),
      duracion_minutos: parseInt(row.duracion_personalizada || row.duracion || '0'),
      // Campos de validación del servicio base
      precio_base: parseFloat(row.precio_base || '0'),
      precio_minimo: row.precio_minimo ? parseFloat(row.precio_minimo) : null,
      precio_maximo: row.precio_maximo ? parseFloat(row.precio_maximo) : null
    }));
  }

  async findByUsuarioAndServicio(usuarioId: string, servicioId: string): Promise<UsuarioServicio | null> {
    const query = `
      SELECT us.id, us.usuario_id, us.servicio_id, us.empresa_id, us.precio_personalizado,
             us.duracion_personalizada, us.habilitado, us.nivel_habilidad, us.notas,
             us.created_at, us.updated_at,
             s.nombre, s.descripcion, s.precio_base, s.precio_minimo, s.precio_maximo, s.duracion, s.activo
      FROM usuario_servicios us
      INNER JOIN servicios s ON us.servicio_id = s.id
      WHERE us.usuario_id = $1 AND us.servicio_id = $2 AND us.habilitado = true AND s.activo = true
    `;
    
    const result = await pool.query(query, [usuarioId, servicioId]);
    
    if (result.rows.length === 0) return null;
    
    // Convertir campos numéricos de string a number y mapear nombres correctos
    const row = result.rows[0];
    return {
      ...row,
      precio: parseFloat(row.precio_personalizado || row.precio_base || '0'),
      duracion_minutos: parseInt(row.duracion_personalizada || row.duracion || '0'),
      // Campos de validación del servicio base
      precio_base: parseFloat(row.precio_base || '0'),
      precio_minimo: row.precio_minimo ? parseFloat(row.precio_minimo) : null,
      precio_maximo: row.precio_maximo ? parseFloat(row.precio_maximo) : null
    };
  }

  async create(data: CreateUsuarioServicioData): Promise<UsuarioServicio> {
    const query = `
      INSERT INTO usuario_servicios (id, usuario_id, servicio_id, empresa_id, 
                                   precio_personalizado, duracion_personalizada, 
                                   habilitado, nivel_habilidad, notas, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id, usuario_id, servicio_id, empresa_id, precio_personalizado,
                duracion_personalizada, habilitado, nivel_habilidad, notas, created_at, updated_at
    `;
    
    const result = await pool.query(query, [
      data.id,
      data.usuario_id,
      data.servicio_id,
      data.empresa_id,
      data.precio_personalizado || null,
      data.duracion_personalizada || null,
      data.habilitado ?? true,
      data.nivel_habilidad || null,
      data.notas || null
    ]);
    
    // Necesitamos hacer un JOIN para obtener los datos del servicio con mapeo correcto
    const servicioQuery = `
      SELECT us.id, us.usuario_id, us.servicio_id, us.empresa_id, us.precio_personalizado,
             us.duracion_personalizada, us.habilitado, us.nivel_habilidad, us.notas,
             us.created_at, us.updated_at,
             s.nombre, s.descripcion, s.precio_base, s.precio_minimo, s.precio_maximo, s.duracion, s.activo
      FROM usuario_servicios us
      INNER JOIN servicios s ON us.servicio_id = s.id
      WHERE us.id = $1
    `;
    
    const servicioResult = await pool.query(servicioQuery, [result.rows[0].id]);
    const row = servicioResult.rows[0];
    
    // Mapear campos para frontend
    return {
      ...row,
      precio: parseFloat(row.precio_personalizado || row.precio_base || '0'),
      duracion_minutos: parseInt(row.duracion_personalizada || row.duracion || '0'),
      // Campos de validación del servicio base
      precio_base: parseFloat(row.precio_base || '0'),
      precio_minimo: row.precio_minimo ? parseFloat(row.precio_minimo) : null,
      precio_maximo: row.precio_maximo ? parseFloat(row.precio_maximo) : null
    };
  }

  async update(id: string, data: UpdateUsuarioServicioData): Promise<UsuarioServicio> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.precio_personalizado !== undefined) {
      fields.push(`precio_personalizado = $${paramIndex++}`);
      values.push(data.precio_personalizado);
    }
    if (data.duracion_personalizada !== undefined) {
      fields.push(`duracion_personalizada = $${paramIndex++}`);
      values.push(data.duracion_personalizada);
    }
    if (data.habilitado !== undefined) {
      fields.push(`habilitado = $${paramIndex++}`);
      values.push(data.habilitado);
    }
    if (data.nivel_habilidad !== undefined) {
      fields.push(`nivel_habilidad = $${paramIndex++}`);
      values.push(data.nivel_habilidad);
    }
    if (data.notas !== undefined) {
      fields.push(`notas = $${paramIndex++}`);
      values.push(data.notas);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE usuario_servicios
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, usuario_id, servicio_id, empresa_id, precio_personalizado,
                duracion_personalizada, habilitado, nivel_habilidad, notas, created_at, updated_at
    `;

    await pool.query(query, values);

    // Obtener el resultado con JOIN y mapeo correcto
    const servicioQuery = `
      SELECT us.id, us.usuario_id, us.servicio_id, us.empresa_id, us.precio_personalizado,
             us.duracion_personalizada, us.habilitado, us.nivel_habilidad, us.notas,
             us.created_at, us.updated_at,
             s.nombre, s.descripcion, s.precio_base, s.precio_minimo, s.precio_maximo, s.duracion, s.activo
      FROM usuario_servicios us
      INNER JOIN servicios s ON us.servicio_id = s.id
      WHERE us.id = $1
    `;
    
    const result = await pool.query(servicioQuery, [id]);
    const row = result.rows[0];
    
    // Mapear campos para frontend
    return {
      ...row,
      precio: parseFloat(row.precio_personalizado || row.precio_base || '0'),
      duracion_minutos: parseInt(row.duracion_personalizada || row.duracion || '0'),
      // Campos de validación del servicio base
      precio_base: parseFloat(row.precio_base || '0'),
      precio_minimo: row.precio_minimo ? parseFloat(row.precio_minimo) : null,
      precio_maximo: row.precio_maximo ? parseFloat(row.precio_maximo) : null
    };
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM usuario_servicios WHERE id = $1';
    await pool.query(query, [id]);
  }

  async estaSubscripto(usuarioId: string, servicioId: string): Promise<boolean> {
    const query = 'SELECT 1 FROM usuario_servicios WHERE usuario_id = $1 AND servicio_id = $2 LIMIT 1';
    const result = await pool.query(query, [usuarioId, servicioId]);
    return result.rows.length > 0;
  }
}
