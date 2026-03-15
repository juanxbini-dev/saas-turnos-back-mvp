import { pool } from '../database/postgres.connection';
import { IProductoRepository } from '../../domain/repositories/IProductoRepository';
import { Producto, CreateProductoData, UpdateProductoData, TopProducto, TopVendedor } from '../../domain/entities/Producto';
import { generarId } from '../../shared/utils/calculos.utils';

export class PostgresProductoRepository implements IProductoRepository {
  async findAll(empresaId: string): Promise<Producto[]> {
    const result = await pool.query(
      `SELECT * FROM productos WHERE empresa_id = $1 ORDER BY nombre ASC`,
      [empresaId]
    );
    return result.rows;
  }

  async findById(id: string): Promise<Producto | null> {
    const result = await pool.query(
      `SELECT * FROM productos WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async create(data: CreateProductoData): Promise<Producto> {
    const result = await pool.query(
      `INSERT INTO productos (id, empresa_id, nombre, descripcion, precio, stock, activo, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
       RETURNING *`,
      [generarId(), data.empresa_id, data.nombre, data.descripcion || null, data.precio, data.stock]
    );
    return result.rows[0];
  }

  async update(id: string, data: UpdateProductoData): Promise<Producto> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (data.nombre !== undefined) { fields.push(`nombre = $${i++}`); values.push(data.nombre); }
    if (data.descripcion !== undefined) { fields.push(`descripcion = $${i++}`); values.push(data.descripcion); }
    if (data.precio !== undefined) { fields.push(`precio = $${i++}`); values.push(data.precio); }
    if (data.activo !== undefined) { fields.push(`activo = $${i++}`); values.push(data.activo); }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE productos SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
      values
    );
    return result.rows[0];
  }

  async addStock(id: string, cantidad: number): Promise<Producto> {
    const result = await pool.query(
      `UPDATE productos SET stock = stock + $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [cantidad, id]
    );
    return result.rows[0];
  }

  async deductStock(id: string, cantidad: number): Promise<Producto> {
    const result = await pool.query(
      `UPDATE productos SET stock = stock - $1, updated_at = NOW()
       WHERE id = $2 AND stock >= $1
       RETURNING *`,
      [cantidad, id]
    );
    if (!result.rows[0]) {
      throw Object.assign(new Error('Stock insuficiente'), { statusCode: 400 });
    }
    return result.rows[0];
  }

  async findBajoStock(empresaId: string, umbral = 3): Promise<Producto[]> {
    const result = await pool.query(
      `SELECT * FROM productos WHERE empresa_id = $1 AND stock <= $2 AND activo = true ORDER BY stock ASC`,
      [empresaId, umbral]
    );
    return result.rows;
  }

  async getTopVendidos(empresaId: string, limit = 10): Promise<TopProducto[]> {
    // Une ventas directas (venta_items) + ventas via turno (venta_productos con producto_id)
    const result = await pool.query(
      `SELECT
         p.id AS producto_id,
         p.nombre,
         COALESCE(SUM(vi.cantidad), 0) + COALESCE(SUM(vp.cantidad), 0) AS total_vendido,
         COALESCE(SUM(vi.precio_total), 0) + COALESCE(SUM(vp.precio_total), 0) AS total_ingresos
       FROM productos p
       LEFT JOIN venta_items vi ON vi.producto_id = p.id
       LEFT JOIN venta_productos vp ON vp.producto_id = p.id
       WHERE p.empresa_id = $1
       GROUP BY p.id, p.nombre
       HAVING COALESCE(SUM(vi.cantidad), 0) + COALESCE(SUM(vp.cantidad), 0) > 0
       ORDER BY total_vendido DESC
       LIMIT $2`,
      [empresaId, limit]
    );
    return result.rows;
  }

  async getTopVendedores(empresaId: string, limit = 5): Promise<TopVendedor[]> {
    // Top vendedores = profesionales que más productos vendieron (directo + vía turno)
    const result = await pool.query(
      `SELECT
         u.id AS vendedor_id,
         u.nombre,
         SUM(sub.cantidad) AS total_vendido,
         SUM(sub.ingresos) AS total_ingresos
       FROM (
         -- Ventas directas
         SELECT v.vendedor_id AS usuario_id, vi.cantidad, vi.precio_total AS ingresos
         FROM ventas v
         JOIN venta_items vi ON vi.venta_id = v.id
         WHERE v.empresa_id = $1
         UNION ALL
         -- Ventas vía turno (usando turno.usuario_id como vendedor)
         SELECT t.usuario_id, vp.cantidad, vp.precio_total AS ingresos
         FROM venta_productos vp
         JOIN turnos t ON t.id = vp.turno_id
         WHERE t.empresa_id = $1 AND vp.producto_id IS NOT NULL
       ) sub
       JOIN usuarios u ON u.id = sub.usuario_id
       GROUP BY u.id, u.nombre
       ORDER BY total_vendido DESC
       LIMIT $2`,
      [empresaId, limit]
    );
    return result.rows;
  }
}
