import { pool } from '../database/postgres.connection';
import { IClienteRepository, CreateClienteData, UpdateClienteData } from '../../domain/repositories/IClienteRepository';
import { Cliente } from '../../domain/entities/Cliente';

export class PostgresClienteRepository implements IClienteRepository {
  async findByEmpresa(empresaId: string): Promise<Cliente[]> {
    const query = `
      SELECT id, nombre, email, telefono, empresa_id, activo, created_at, updated_at
      FROM clientes
      WHERE empresa_id = $1
      ORDER BY nombre ASC
    `;
    
    const result = await pool.query(query, [empresaId]);
    return result.rows;
  }

  async findById(id: string): Promise<Cliente | null> {
    const query = `
      SELECT id, nombre, email, telefono, empresa_id, activo, created_at, updated_at
      FROM clientes
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async create(data: CreateClienteData): Promise<Cliente> {
    const query = `
      INSERT INTO clientes (id, nombre, email, telefono, empresa_id, activo, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, true, NOW(), NOW())
      RETURNING id, nombre, email, telefono, empresa_id, activo, created_at, updated_at
    `;
    
    const result = await pool.query(query, [
      data.id,
      data.nombre,
      data.email,
      data.telefono || null,
      data.empresa_id
    ]);
    
    return result.rows[0];
  }

  async update(id: string, data: UpdateClienteData): Promise<Cliente> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.nombre !== undefined) {
      fields.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
    }

    if (data.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }

    if (data.telefono !== undefined) {
      fields.push(`telefono = $${paramIndex++}`);
      values.push(data.telefono);
    }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE clientes
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, nombre, email, telefono, empresa_id, activo, created_at, updated_at
    `;
    
    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async toggleActivo(id: string, activo: boolean): Promise<Cliente> {
    const query = `
      UPDATE clientes
      SET activo = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, nombre, email, telefono, empresa_id, activo, created_at, updated_at
    `;
    
    const result = await pool.query(query, [activo, id]);
    return result.rows[0];
  }

  async existeEmail(email: string, empresaId: string, excludeId?: string): Promise<boolean> {
    let query = `
      SELECT COUNT(*) as count
      FROM clientes
      WHERE email = $1 AND empresa_id = $2
    `;
    
    const params: any[] = [email, empresaId];
    
    if (excludeId) {
      query += ` AND id != $3`;
      params.push(excludeId);
    }
    
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count) > 0;
  }

  async existeTelefono(telefono: string, empresaId: string, excludeId?: string): Promise<boolean> {
    let query = `
      SELECT COUNT(*) as count
      FROM clientes
      WHERE telefono = $1 AND empresa_id = $2
    `;
    
    const params: any[] = [telefono, empresaId];
    
    if (excludeId) {
      query += ` AND id != $3`;
      params.push(excludeId);
    }
    
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count) > 0;
  }
}
