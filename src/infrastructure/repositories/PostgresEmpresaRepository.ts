import { IEmpresaRepository } from '../../domain/repositories/IEmpresaRepository';
import { Empresa } from '../../domain/entities/Empresa';
import { CreateEmpresaData, UpdateEmpresaData } from '../../domain/entities/Empresa';
import { pool } from '../database/postgres.connection';

export class PostgresEmpresaRepository implements IEmpresaRepository {
  async findByDominio(dominio: string): Promise<Empresa | null> {
    // Si no tiene .com, intentarlo con .com
    const searchDominio = dominio.includes('.') ? dominio : `${dominio}.com`;
    
    const query = `
      SELECT id, nombre, dominio, activo, created_at, updated_at
      FROM empresas
      WHERE dominio = $1
    `;
    
    console.log('🔍 Repository - Query:', query);
    console.log('🔍 Repository - Buscando dominio:', searchDominio, '(original:', dominio, ')');
    
    const result = await pool.query(query, [searchDominio]);
    console.log('🔍 Repository - Resultados:', result.rows.length, 'filas');
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToEmpresa(result.rows[0]);
  }

  async findById(id: string): Promise<Empresa | null> {
    const query = `
      SELECT id, nombre, slug, email, telefono, direccion, activo, created_at, updated_at
      FROM empresas
      WHERE id = $1
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    return this.mapRowToEmpresa(result.rows[0]);
  }

  async findAll(): Promise<Empresa[]> {
    const query = `
      SELECT id, nombre, dominio, activo, created_at, updated_at
      FROM empresas
      ORDER BY nombre
    `;
    
    const result = await pool.query(query);
    
    return result.rows.map(row => this.mapRowToEmpresa(row));
  }

  async create(data: CreateEmpresaData): Promise<Empresa> {
    const query = `
      INSERT INTO empresas (id, nombre, dominio, activo)
      VALUES ($1, $2, $3, $4)
      RETURNING id, nombre, dominio, activo, created_at, updated_at
    `;
    
    const result = await pool.query(query, [
      data.id,
      data.nombre,
      data.dominio,
      data.activo
    ]);
    
    return this.mapRowToEmpresa(result.rows[0]);
  }

  async update(id: string, data: UpdateEmpresaData): Promise<Empresa> {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.nombre !== undefined) {
      fields.push(`nombre = $${paramIndex++}`);
      values.push(data.nombre);
    }
    if (data.dominio !== undefined) {
      fields.push(`dominio = $${paramIndex++}`);
      values.push(data.dominio);
    }
    if (data.activo !== undefined) {
      fields.push(`activo = $${paramIndex++}`);
      values.push(data.activo);
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(id);
    
    const query = `
      UPDATE empresas
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING id, nombre, slug, email, telefono, direccion, activo, created_at, updated_at
    `;
    
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      throw new Error('Empresa not found');
    }
    
    return this.mapRowToEmpresa(result.rows[0]);
  }

  async toggleActivo(id: string): Promise<Empresa> {
    const query = `
      UPDATE empresas
      SET activo = NOT activo, updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING id, nombre, slug, email, telefono, direccion, activo, created_at, updated_at
    `;
    
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Empresa not found');
    }
    
    return this.mapRowToEmpresa(result.rows[0]);
  }

  async existeDominio(dominio: string, excludeId?: string): Promise<boolean> {
    let query = `
      SELECT 1
      FROM empresas
      WHERE dominio = $1
    `;
    const params = [dominio];
    
    if (excludeId) {
      query += ' AND id != $2';
      params.push(excludeId);
    }
    
    const result = await pool.query(query, params);
    
    return result.rows.length > 0;
  }

  private mapRowToEmpresa(row: any): Empresa {
    console.log('🔍 Repository - Mapeando fila:', row);
    return {
      id: row.id,
      nombre: row.nombre,
      dominio: row.dominio,
      activo: row.activo,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}
