import { pool } from '../database/postgres.connection';
import { IProductoRepository } from '../../domain/repositories/IProductoRepository';
import { Producto, CreateProductoData, UpdateProductoData, TopProducto, TopVendedor, ProductoVentaFinanzas } from '../../domain/entities/Producto';
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
      `INSERT INTO productos (id, empresa_id, nombre, descripcion, precio_efectivo, precio_transferencia, costo, stock, marca_id, activo, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true, NOW(), NOW())
       RETURNING *`,
      [generarId(), data.empresa_id, data.nombre, data.descripcion || null, data.precio_efectivo, data.precio_transferencia, data.costo ?? null, data.stock, data.marca_id || null]
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
    if (data.precio_efectivo !== undefined) { fields.push(`precio_efectivo = $${i++}`); values.push(data.precio_efectivo); }
    if (data.precio_transferencia !== undefined) { fields.push(`precio_transferencia = $${i++}`); values.push(data.precio_transferencia); }
    if (data.costo !== undefined) { fields.push(`costo = $${i++}`); values.push(data.costo); }
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

  async getVentasFinanzas(empresaId: string, fechaDesde?: string, fechaHasta?: string): Promise<ProductoVentaFinanzas[]> {
    const params: unknown[] = [empresaId];
    let fechaFiltro = '';
    if (fechaDesde) { params.push(fechaDesde); fechaFiltro += ` AND vp.created_at >= $${params.length}`; }
    if (fechaHasta) { params.push(fechaHasta); fechaFiltro += ` AND vp.created_at < ($${params.length}::date + interval '1 day')`; }

    const result = await pool.query(
      `SELECT
         p.id AS producto_id,
         p.nombre,
         p.precio_efectivo,
         p.precio_transferencia,
         p.costo,
         COALESCE(SUM(vp.cantidad), 0)::int AS total_unidades,
         COALESCE(SUM(CASE WHEN vp.metodo_pago = 'efectivo' THEN vp.cantidad ELSE 0 END), 0)::int AS unidades_efectivo,
         COALESCE(SUM(CASE WHEN vp.metodo_pago = 'transferencia' THEN vp.cantidad ELSE 0 END), 0)::int AS unidades_transferencia,
         COALESCE(SUM(CASE WHEN vp.metodo_pago = 'pendiente' THEN vp.cantidad ELSE 0 END), 0)::int AS unidades_pendiente,
         COALESCE(SUM(CASE WHEN vp.metodo_pago = 'efectivo' THEN vp.precio_total ELSE 0 END), 0) AS total_efectivo,
         COALESCE(SUM(CASE WHEN vp.metodo_pago = 'transferencia' THEN vp.precio_total ELSE 0 END), 0) AS total_transferencia,
         COALESCE(SUM(CASE WHEN vp.metodo_pago = 'pendiente' THEN vp.precio_total ELSE 0 END), 0) AS total_pendiente,
         COALESCE(SUM(vp.comision_monto), 0) AS total_comision,
         COALESCE(SUM(vp.neto_vendedor), 0) AS total_neto_vendedor
       FROM productos p
       LEFT JOIN venta_productos vp ON vp.producto_id = p.id AND vp.empresa_id = p.empresa_id ${fechaFiltro}
       WHERE p.empresa_id = $1 AND p.activo = true
       GROUP BY p.id, p.nombre, p.precio_efectivo, p.precio_transferencia, p.costo
       HAVING COALESCE(SUM(vp.cantidad), 0) > 0
       ORDER BY total_unidades DESC`,
      params
    );
    return result.rows;
  }
}
