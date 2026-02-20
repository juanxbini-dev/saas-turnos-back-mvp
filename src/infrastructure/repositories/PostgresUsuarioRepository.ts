import { pool } from '../database/postgres.connection';
import { IUsuarioRepository, CreateUsuarioData, UpdateDatosData } from '../../domain/repositories/IUsuarioRepository';
import { UsuarioPublico, User } from '../../domain/entities/User';

export class PostgresUsuarioRepository implements IUsuarioRepository {
  async findByEmpresa(empresaId: string): Promise<UsuarioPublico[]> {
    const query = `
      SELECT u.id, u.email, u.nombre, u.username, u.empresa_id, u.roles, u.activo, 
             u.last_login, u.created_at, u.updated_at
      FROM usuarios u
      WHERE u.empresa_id = $1
      ORDER BY u.nombre ASC
    `;
    
    const result = await pool.query(query, [empresaId]);
    return result.rows;
  }

  async findById(id: string): Promise<UsuarioPublico | null> {
    const query = `
      SELECT u.id, u.email, u.nombre, u.username, u.empresa_id, u.roles, u.activo, 
             u.last_login, u.created_at, u.updated_at
      FROM usuarios u
      WHERE u.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    const query = `
      SELECT u.id, u.email, u.password, u.nombre, u.username, u.empresa_id, u.roles, u.activo, 
             u.last_login, u.created_at, u.updated_at
      FROM usuarios u
      WHERE u.id = $1
    `;
    
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async create(data: CreateUsuarioData): Promise<UsuarioPublico> {
    const roles = data.rol === 'admin' ? ['admin', 'staff'] : ['staff'];
    
    const query = `
      INSERT INTO usuarios (id, email, password, nombre, username, empresa_id, roles, activo, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING id, email, nombre, username, empresa_id, roles, activo, last_login, created_at, updated_at
    `;
    
    const result = await pool.query(query, [
      data.id,
      data.email,
      data.password,
      data.nombre,
      data.username,
      data.empresa_id,
      roles,
      true
    ]);
    
    return result.rows[0];
  }

  async updateDatos(id: string, data: UpdateDatosData): Promise<UsuarioPublico> {
    const query = `
      UPDATE usuarios
      SET nombre = $1, username = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, email, nombre, username, empresa_id, roles, activo, last_login, created_at, updated_at
    `;
    
    const result = await pool.query(query, [data.nombre, data.username, id]);
    return result.rows[0];
  }

  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    const query = `
      UPDATE usuarios
      SET password = $1, updated_at = NOW()
      WHERE id = $2
    `;
    
    await pool.query(query, [hashedPassword, id]);
  }

  async updateRol(id: string, roles: string[]): Promise<UsuarioPublico> {
    const query = `
      UPDATE usuarios
      SET roles = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, email, nombre, username, empresa_id, roles, activo, last_login, created_at, updated_at
    `;
    
    const result = await pool.query(query, [roles, id]);
    return result.rows[0];
  }

  async toggleActivo(id: string, activo: boolean): Promise<UsuarioPublico> {
    const query = `
      UPDATE usuarios
      SET activo = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, email, nombre, username, empresa_id, roles, activo, last_login, created_at, updated_at
    `;
    
    const result = await pool.query(query, [activo, id]);
    return result.rows[0];
  }

  async existeUsername(username: string, empresaId: string, excludeId?: string): Promise<boolean> {
    let query = `
      SELECT COUNT(*) as count
      FROM usuarios u
      WHERE u.username = $1 AND u.empresa_id = $2
    `;
    
    const params: any[] = [username, empresaId];
    
    if (excludeId) {
      query += ` AND u.id != $3`;
      params.push(excludeId);
    }
    
    const result = await pool.query(query, params);
    return parseInt(result.rows[0].count) > 0;
  }
}
