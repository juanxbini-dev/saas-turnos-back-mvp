import { pool } from '../database/postgres.connection';
import { IUsuarioRepository, CreateUsuarioData, UpdateDatosData } from '../../domain/repositories/IUsuarioRepository';
import { UsuarioPublico, User } from '../../domain/entities/User';

export class PostgresUsuarioRepository implements IUsuarioRepository {
  async findByEmpresa(empresaId: string): Promise<UsuarioPublico[]> {
    const query = `
      SELECT u.id, u.email, u.nombre, u.username, u.empresa_id, u.roles, u.activo,
             u.last_login, u.created_at, u.updated_at,
             u.comision_turno, u.comision_producto, u.avatar_url
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
             u.last_login, u.created_at, u.updated_at,
             u.comision_turno, u.comision_producto, u.avatar_url
      FROM usuarios u
      WHERE u.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async findByIdWithPassword(id: string): Promise<User | null> {
    const query = `
      SELECT u.id, u.email, u.password, u.nombre, u.username, u.empresa_id, u.roles, u.activo,
             u.last_login, u.created_at, u.updated_at, u.avatar_url, u.avatar_public_id
      FROM usuarios u
      WHERE u.id = $1
    `;

    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  }

  async create(data: CreateUsuarioData): Promise<UsuarioPublico> {
    const roles = data.rol === 'admin' ? ['admin', 'staff'] : ['staff'];
    
    const query = `
      INSERT INTO usuarios (id, email, password, nombre, username, empresa_id, roles, activo, comision_turno, comision_producto, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING id, email, nombre, username, empresa_id, roles, activo, last_login, created_at, updated_at, comision_turno, comision_producto
    `;
    
    const result = await pool.query(query, [
      data.id,
      data.email,
      data.password,
      data.nombre,
      data.username,
      data.empresa_id,
      roles,
      true,
      data.comision_turno || 20,
      data.comision_producto || 20
    ]);
    
    return result.rows[0];
  }

  async updateDatos(id: string, data: UpdateDatosData): Promise<UsuarioPublico> {
    const query = `
      UPDATE usuarios
      SET nombre = $1, username = $2, comision_turno = $3, comision_producto = $4, updated_at = NOW()
      WHERE id = $5
      RETURNING id, email, nombre, username, empresa_id, roles, activo, last_login, created_at, updated_at, comision_turno, comision_producto
    `;
    
    const result = await pool.query(query, [
      data.nombre, 
      data.username, 
      data.comision_turno, 
      data.comision_producto, 
      id
    ]);
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

  async findProfesionalesByEmpresa(empresaId: string, params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<UsuarioPublico[]> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const offset = (page - 1) * limit;
    const search = params?.search;

    let query = `
      SELECT id, email, nombre, username, empresa_id, roles, activo, last_login, created_at, updated_at, avatar_url
      FROM usuarios
      WHERE empresa_id = $1 AND activo = true
    `;
    
    const queryParams: any[] = [empresaId];

    if (search) {
      query += ` AND (nombre ILIKE $2 OR email ILIKE $2 OR username ILIKE $2)`;
      queryParams.push(`%${search}%`);
    }

    query += ` ORDER BY nombre ASC LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);
    return result.rows;
  }

  async countProfesionalesByEmpresa(empresaId: string, search?: string): Promise<number> {
    let query = `
      SELECT COUNT(*) as count
      FROM usuarios
      WHERE empresa_id = $1 AND activo = true
    `;

    const queryParams: any[] = [empresaId];

    if (search) {
      query += ` AND (nombre ILIKE $2 OR email ILIKE $2 OR username ILIKE $2)`;
      queryParams.push(`%${search}%`);
    }

    const result = await pool.query(query, queryParams);
    return parseInt(result.rows[0].count);
  }

  async updateAvatar(id: string, avatarUrl: string | null, avatarPublicId: string | null): Promise<UsuarioPublico> {
    const query = `
      UPDATE usuarios
      SET avatar_url = $1, avatar_public_id = $2, updated_at = NOW()
      WHERE id = $3
      RETURNING id, email, nombre, username, empresa_id, roles, activo, last_login, created_at, updated_at, comision_turno, comision_producto, avatar_url
    `;

    const result = await pool.query(query, [avatarUrl, avatarPublicId, id]);
    return result.rows[0];
  }
}
