import { pool } from '../database/postgres.connection';
import { IProductoRepository } from '../../domain/repositories/IProductoRepository';
import { Producto, CreateProductoData, UpdateProductoData, TopProducto, TopVendedor } from '../../domain/entities/Producto';
import { generarId } from '../../shared/utils/calculos.utils';

export class PostgresProductoRepository implements IProductoRepository {
  private readonly SELECT_PRODUCTO = `
    SELECT p.*, m.nombre AS marca_nombre
    FROM productos p
    LEFT JOIN marcas m ON m.id = p.marca_id
  `;

  async findAll(empresaId: string): Promise<Producto[]> {
    const result = await pool.query(
      `${this.SELECT_PRODUCTO} WHERE p.empresa_id = $1 ORDER BY p.nombre ASC`,
      [empresaId]
    );
    return result.rows;
  }

  async findById(id: string): Promise<Producto | null> {
    const result = await pool.query(
      `${this.SELECT_PRODUCTO} WHERE p.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async create(data: CreateProductoData): Promise<Producto> {
    const result = await pool.query(
      `INSERT INTO productos (id, empresa_id, nombre, descripcion, precio, stock, marca_id, activo, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
       RETURNING *`,
      [generarId(), data.empresa_id, data.nombre, data.descripcion || null, data.precio, data.stock, data.marca_id || null]
    );
    const inserted = result.rows[0];
    return (await this.findById(inserted.id))!;
  }

  async update(id: string, data: UpdateProductoData): Promise<Producto> {
    const fields: string[] = [];
    const values: unknown[] = [];
    let i = 1;

    if (data.nombre !== undefined) { fields.push(`nombre = $${i++}`); values.push(data.nombre); }
    if (data.descripcion !== undefined) { fields.push(`descripcion = $${i++}`); values.push(data.descripcion); }
    if (data.precio !== undefined) { fields.push(`precio = $${i++}`); values.push(data.precio); }
    if (data.activo !== undefined) { fields.push(`activo = $${i++}`); values.push(data.activo); }
    if (data.marca_id !== undefined) { fields.push(`marca_id = $${i++}`); values.push(data.marca_id); }

    fields.push(`updated_at = NOW()`);
    values.push(id);

    await pool.query(
      `UPDATE productos SET ${fields.join(', ')} WHERE id = $${i}`,
      values
    );
    return (await this.findById(id))!;
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

  async delete(id: string): Promise<void> {
    await pool.query(`DELETE FROM productos WHERE id = $1`, [id]);
  }

  async findByNombre(empresaId: string, nombre: string, excludeId?: string): Promise<Producto | null> {
    const query = excludeId
      ? `SELECT * FROM productos WHERE empresa_id = $1 AND LOWER(nombre) = LOWER($2) AND id != $3`
      : `SELECT * FROM productos WHERE empresa_id = $1 AND LOWER(nombre) = LOWER($2)`;
    const params = excludeId ? [empresaId, nombre, excludeId] : [empresaId, nombre];
    const result = await pool.query(query, params);
    return result.rows[0] || null;
  }

  async findBajoStock(empresaId: string, umbral = 3): Promise<Producto[]> {
    const result = await pool.query(
      `${this.SELECT_PRODUCTO} WHERE p.empresa_id = $1 AND p.stock <= $2 AND p.activo = true ORDER BY p.stock ASC`,
      [empresaId, umbral]
    );
    return result.rows;
  }

  async getTopVendidos(empresaId: string, limit = 10): Promise<TopProducto[]> {
    const result = await pool.query(
      `SELECT
         p.id AS producto_id,
         p.nombre,
         COALESCE(SUM(vp.cantidad), 0) AS total_vendido,
         COALESCE(SUM(vp.precio_total), 0) AS total_ingresos
       FROM productos p
       LEFT JOIN venta_productos vp ON vp.producto_id = p.id
       WHERE p.empresa_id = $1
       GROUP BY p.id, p.nombre
       HAVING COALESCE(SUM(vp.cantidad), 0) > 0
       ORDER BY total_vendido DESC
       LIMIT $2`,
      [empresaId, limit]
    );
    return result.rows;
  }

  async getTopVendedores(empresaId: string, limit = 5): Promise<TopVendedor[]> {
    const result = await pool.query(
      `SELECT
         u.id AS vendedor_id,
         u.nombre,
         SUM(vp.cantidad) AS total_vendido,
         SUM(vp.precio_total) AS total_ingresos
       FROM venta_productos vp
       JOIN usuarios u ON u.id = vp.vendedor_id
       WHERE vp.empresa_id = $1
       GROUP BY u.id, u.nombre
       ORDER BY total_vendido DESC
       LIMIT $2`,
      [empresaId, limit]
    );
    return result.rows;
  }
}
