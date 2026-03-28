import { pool } from '../database/postgres.connection';
import { IMarcaRepository } from '../../domain/repositories/IMarcaRepository';
import { Marca, CreateMarcaData, UpdateMarcaData, MarcaConProductos } from '../../domain/entities/Marca';
import { generarId } from '../../shared/utils/calculos.utils';

export class PostgresMarcaRepository implements IMarcaRepository {
  async findAll(empresaId: string): Promise<MarcaConProductos[]> {
    const result = await pool.query(
      `SELECT m.*, COUNT(p.id)::int AS total_productos
       FROM marcas m
       LEFT JOIN productos p ON p.marca_id = m.id AND p.activo = true
       WHERE m.empresa_id = $1
       GROUP BY m.id
       ORDER BY m.nombre ASC`,
      [empresaId]
    );
    return result.rows;
  }

  async findById(id: string): Promise<Marca | null> {
    const result = await pool.query(
      `SELECT * FROM marcas WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async findByNombre(empresaId: string, nombre: string, excludeId?: string): Promise<Marca | null> {
    const query = excludeId
      ? `SELECT * FROM marcas WHERE empresa_id = $1 AND LOWER(nombre) = LOWER($2) AND id != $3`
      : `SELECT * FROM marcas WHERE empresa_id = $1 AND LOWER(nombre) = LOWER($2)`;
    const params = excludeId ? [empresaId, nombre, excludeId] : [empresaId, nombre];
    const result = await pool.query(query, params);
    return result.rows[0] || null;
  }

  async create(data: CreateMarcaData): Promise<Marca> {
    const result = await pool.query(
      `INSERT INTO marcas (id, empresa_id, nombre, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [generarId(), data.empresa_id, data.nombre]
    );
    return result.rows[0];
  }

  async update(id: string, data: UpdateMarcaData): Promise<Marca> {
    const result = await pool.query(
      `UPDATE marcas SET nombre = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [data.nombre, id]
    );
    return result.rows[0];
  }

  async delete(id: string): Promise<void> {
    await pool.query(`DELETE FROM marcas WHERE id = $1`, [id]);
  }

  async countProductos(id: string): Promise<number> {
    const result = await pool.query(
      `SELECT COUNT(*)::int AS total FROM productos WHERE marca_id = $1`,
      [id]
    );
    return result.rows[0].total;
  }
}
