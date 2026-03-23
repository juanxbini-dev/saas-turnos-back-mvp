import { pool } from '../database/postgres.connection';
import {
  ILandingConfigRepository,
  ILandingProfesionalRepository,
  UpdateLandingConfigData
} from '../../domain/repositories/ILandingConfigRepository';
import { LandingConfig, LandingProfesional } from '../../domain/entities/LandingConfig';

export class PostgresLandingConfigRepository implements ILandingConfigRepository {
  async findByEmpresa(empresaId: string): Promise<LandingConfig | null> {
    const result = await pool.query(
      `SELECT * FROM landing_config WHERE empresa_id = $1`,
      [empresaId]
    );
    return result.rows[0] || null;
  }

  async upsert(empresaId: string): Promise<LandingConfig> {
    const result = await pool.query(
      `INSERT INTO landing_config (empresa_id)
       VALUES ($1)
       ON CONFLICT (empresa_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [empresaId]
    );
    return result.rows[0];
  }

  async update(empresaId: string, data: UpdateLandingConfigData): Promise<LandingConfig> {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.titulo !== undefined)      { fields.push(`titulo = $${i++}`);      values.push(data.titulo); }
    if (data.descripcion !== undefined) { fields.push(`descripcion = $${i++}`); values.push(data.descripcion); }
    if (data.direccion !== undefined)      { fields.push(`direccion = $${i++}`);      values.push(data.direccion); }
    if (data.direccion_maps !== undefined) { fields.push(`direccion_maps = $${i++}`); values.push(data.direccion_maps); }
    if (data.horarios !== undefined)       { fields.push(`horarios = $${i++}`);       values.push(JSON.stringify(data.horarios)); }

    fields.push(`updated_at = NOW()`);
    values.push(empresaId);

    const result = await pool.query(
      `UPDATE landing_config SET ${fields.join(', ')} WHERE empresa_id = $${i} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async updateLogo(empresaId: string, logoUrl: string | null, logoPublicId: string | null): Promise<LandingConfig> {
    const result = await pool.query(
      `UPDATE landing_config SET logo_url = $1, logo_public_id = $2, updated_at = NOW()
       WHERE empresa_id = $3 RETURNING *`,
      [logoUrl, logoPublicId, empresaId]
    );
    return result.rows[0];
  }

  async updateFondo(empresaId: string, fondoUrl: string | null, fondoPublicId: string | null): Promise<LandingConfig> {
    const result = await pool.query(
      `UPDATE landing_config SET fondo_url = $1, fondo_public_id = $2, updated_at = NOW()
       WHERE empresa_id = $3 RETURNING *`,
      [fondoUrl, fondoPublicId, empresaId]
    );
    return result.rows[0];
  }
}

export class PostgresLandingProfesionalRepository implements ILandingProfesionalRepository {
  async findAllByEmpresa(empresaId: string): Promise<LandingProfesional[]> {
    const result = await pool.query(
      `SELECT lp.id, lp.empresa_id, lp.usuario_id, lp.subtitulo, lp.descripcion, lp.orden, lp.visible, lp.created_at, lp.updated_at, u.nombre, u.username, u.avatar_url
       FROM landing_profesionales lp
       JOIN usuarios u ON u.id = lp.usuario_id
       WHERE lp.empresa_id = $1
       ORDER BY lp.visible DESC, lp.orden ASC, u.nombre ASC`,
      [empresaId]
    );
    return result.rows;
  }

  async upsert(empresaId: string, usuarioId: string): Promise<LandingProfesional> {
    const result = await pool.query(
      `INSERT INTO landing_profesionales (empresa_id, usuario_id)
       VALUES ($1, $2)
       ON CONFLICT (empresa_id, usuario_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [empresaId, usuarioId]
    );
    return result.rows[0];
  }

  async update(empresaId: string, usuarioId: string, data: { subtitulo?: string; descripcion?: string; visible?: boolean }): Promise<LandingProfesional> {
    const fields: string[] = [];
    const values: any[] = [];
    let i = 1;

    if (data.subtitulo !== undefined)   { fields.push(`subtitulo = $${i++}`);   values.push(data.subtitulo); }
    if (data.descripcion !== undefined) { fields.push(`descripcion = $${i++}`); values.push(data.descripcion); }
    if (data.visible !== undefined)     { fields.push(`visible = $${i++}`);     values.push(data.visible); }

    fields.push(`updated_at = NOW()`);
    values.push(empresaId, usuarioId);

    const result = await pool.query(
      `UPDATE landing_profesionales SET ${fields.join(', ')}
       WHERE empresa_id = $${i} AND usuario_id = $${i + 1}
       RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async updateOrden(empresaId: string, orden: { usuarioId: string; orden: number }[]): Promise<void> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const item of orden) {
        await client.query(
          `UPDATE landing_profesionales SET orden = $1, updated_at = NOW()
           WHERE empresa_id = $2 AND usuario_id = $3`,
          [item.orden, empresaId, item.usuarioId]
        );
      }
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async findVisiblesByEmpresa(empresaId: string): Promise<LandingProfesional[]> {
    const result = await pool.query(
      `SELECT lp.id, lp.empresa_id, lp.usuario_id, lp.subtitulo, lp.descripcion, lp.orden, lp.visible, lp.created_at, lp.updated_at, u.nombre, u.username, u.avatar_url
       FROM landing_profesionales lp
       JOIN usuarios u ON u.id = lp.usuario_id
       WHERE lp.empresa_id = $1 AND lp.visible = true AND u.activo = true
       ORDER BY lp.orden ASC`,
      [empresaId]
    );
    return result.rows;
  }
}
