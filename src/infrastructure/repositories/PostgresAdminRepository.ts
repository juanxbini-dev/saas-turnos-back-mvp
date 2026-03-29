import { pool } from '../database/postgres.connection';
import {
  IAdminRepository,
  EmpresaConStats,
  EmpresaDetalle,
  GlobalStats,
} from '../../domain/repositories/IAdminRepository';
import { Empresa } from '../../domain/entities/Empresa';

export class PostgresAdminRepository implements IAdminRepository {
  async getEmpresas(): Promise<EmpresaConStats[]> {
    const query = `
      SELECT
        e.id, e.nombre, e.dominio, e.activo, e.created_at, e.updated_at,
        COUNT(DISTINCT u.id)::int  AS total_usuarios,
        COUNT(DISTINCT t.id)::int  AS total_turnos,
        COUNT(DISTINCT c.id)::int  AS total_clientes
      FROM empresas e
      LEFT JOIN usuarios  u ON u.empresa_id = e.id
      LEFT JOIN turnos    t ON t.empresa_id = e.id
      LEFT JOIN clientes  c ON c.empresa_id = e.id
      GROUP BY e.id
      ORDER BY e.nombre ASC
    `;
    const result = await pool.query(query);
    return result.rows;
  }

  async getEmpresaDetalle(empresaId: string): Promise<EmpresaDetalle | null> {
    const empresaQuery = `
      SELECT
        e.id, e.nombre, e.dominio, e.activo, e.created_at, e.updated_at,
        COUNT(DISTINCT u.id)::int  AS total_usuarios,
        COUNT(DISTINCT t.id)::int  AS total_turnos,
        COUNT(DISTINCT c.id)::int  AS total_clientes
      FROM empresas e
      LEFT JOIN usuarios  u ON u.empresa_id = e.id
      LEFT JOIN turnos    t ON t.empresa_id = e.id
      LEFT JOIN clientes  c ON c.empresa_id = e.id
      WHERE e.id = $1
      GROUP BY e.id
    `;
    const empresaResult = await pool.query(empresaQuery, [empresaId]);
    if (!empresaResult.rows[0]) return null;

    const usuariosQuery = `
      SELECT id, email, nombre, username, empresa_id, roles, activo,
             last_login, created_at, updated_at, comision_turno, comision_producto, avatar_url
      FROM usuarios
      WHERE empresa_id = $1
      ORDER BY nombre ASC
    `;
    const usuariosResult = await pool.query(usuariosQuery, [empresaId]);

    return {
      ...empresaResult.rows[0],
      usuarios: usuariosResult.rows,
    };
  }

  async toggleEmpresaActivo(empresaId: string): Promise<Empresa> {
    const query = `
      UPDATE empresas
      SET activo = NOT activo, updated_at = NOW()
      WHERE id = $1
      RETURNING id, nombre, dominio, activo, created_at, updated_at
    `;
    const result = await pool.query(query, [empresaId]);
    return result.rows[0];
  }

  async getGlobalStats(): Promise<GlobalStats> {
    const query = `
      SELECT
        COUNT(DISTINCT e.id)::int                               AS total_empresas,
        COUNT(DISTINCT e.id) FILTER (WHERE e.activo)::int       AS empresas_activas,
        COUNT(DISTINCT u.id)::int                               AS total_usuarios,
        COUNT(DISTINCT t.id)::int                               AS total_turnos,
        COUNT(DISTINCT c.id)::int                               AS total_clientes
      FROM empresas e
      LEFT JOIN usuarios  u ON u.empresa_id = e.id
      LEFT JOIN turnos    t ON t.empresa_id = e.id
      LEFT JOIN clientes  c ON c.empresa_id = e.id
    `;
    const result = await pool.query(query);
    return result.rows[0];
  }
}
