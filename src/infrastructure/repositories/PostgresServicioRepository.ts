import { pool } from '../database/postgres.connection';
import { IServicioRepository, CreateServicioData, UpdateServicioData } from '../../domain/repositories/IServicioRepository';
import { Servicio } from '../../domain/entities/Servicio';

export class PostgresServicioRepository implements IServicioRepository {
  async findByEmpresa(empresaId: string): Promise<Servicio[]> {
    const query = `
      SELECT id, nombre, descripcion, duracion, precio_base, precio_minimo, 
             precio_maximo, empresa_id, activo, created_at, updated_at
      FROM servicios
      WHERE empresa_id = $1 AND activo = true
      ORDER BY nombre ASC
    `;
    
    const result = await pool.query(query, [empresaId]);
    return result.rows;
  }

  async findById(id: string): Promise<Servicio | null> {
    const query = `
      SELECT id, nombre, descripcion, duracion, precio_base, precio_minimo, 
             precio_maximo, empresa_id, activo, created_at, updated_at
      FROM servicios
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async create(data: CreateServicioData): Promise<Servicio> {
    const query = `
      INSERT INTO servicios (id, nombre, descripcion, duracion, precio_base, 
                           precio_minimo, precio_maximo, empresa_id, activo, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING id, nombre, descripcion, duracion, precio_base, precio_minimo,
                precio_maximo, empresa_id, activo, created_at, updated_at
    `;
    
    const result = await pool.query(query, [
      data.id,
      data.nombre,
      data.descripcion || null,
      data.duracion,
      data.precio_base || null,
      data.precio_minimo || null,
      data.precio_maximo || null,
      data.empresa_id,
      true
    ]);
    
    return result.rows[0];
  }

  async update(id: string, data: UpdateServicioData): Promise<Servicio> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.nombre !== undefined) {
      fields.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
    }
    if (data.descripcion !== undefined) {
      fields.push(`descripcion = $${paramIndex++}`);
      values.push(data.descripcion);
    }
    if (data.duracion !== undefined) {
      fields.push(`duracion = $${paramIndex++}`);
      values.push(data.duracion);
    }
    if (data.precio_base !== undefined) {
      fields.push(`precio_base = $${paramIndex++}`);
      values.push(data.precio_base);
    }
    if (data.precio_minimo !== undefined) {
      fields.push(`precio_minimo = $${paramIndex++}`);
      values.push(data.precio_minimo);
    }
    if (data.precio_maximo !== undefined) {
      fields.push(`precio_maximo = $${paramIndex++}`);
      values.push(data.precio_maximo);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE servicios
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, nombre, descripcion, duracion, precio_base, precio_minimo,
                precio_maximo, empresa_id, activo, created_at, updated_at
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async toggleActivo(id: string, activo: boolean): Promise<Servicio> {
    const query = `
      UPDATE servicios
      SET activo = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, nombre, descripcion, duracion, precio_base, precio_minimo,
                precio_maximo, empresa_id, activo, created_at, updated_at
    `;
    
    const result = await pool.query(query, [activo, id]);
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    const query = 'DELETE FROM servicios WHERE id = $1';
    await pool.query(query, [id]);
  }
}
