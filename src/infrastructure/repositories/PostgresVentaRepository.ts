import { pool } from '../database/postgres.connection';
import { IVentaRepository } from '../../domain/repositories/IVentaRepository';
import { Venta, CreateVentaData } from '../../domain/entities/Venta';
import { generarId } from '../../shared/utils/calculos.utils';

export class PostgresVentaRepository implements IVentaRepository {
  async create(data: CreateVentaData): Promise<Venta> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const total = data.items.reduce((sum, item) => sum + item.precio_unitario * item.cantidad, 0);

      // 1. Crear venta
      const ventaResult = await client.query(
        `INSERT INTO ventas (id, empresa_id, cliente_id, vendedor_id, metodo_pago, total, notas, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
         RETURNING *`,
        [generarId(), data.empresa_id, data.cliente_id || null, data.vendedor_id, data.metodo_pago, total, data.notas || null]
      );
      const venta: Venta = ventaResult.rows[0];

      // 2. Crear items + descontar stock
      const items = [];
      for (const item of data.items) {
        // Obtener nombre y precio actual del producto
        const prodResult = await client.query(
          `SELECT nombre, precio, stock FROM productos WHERE id = $1 AND empresa_id = $2`,
          [item.producto_id, data.empresa_id]
        );
        if (!prodResult.rows[0]) {
          throw Object.assign(new Error(`Producto no encontrado: ${item.producto_id}`), { statusCode: 404 });
        }
        const prod = prodResult.rows[0];
        if (prod.stock < item.cantidad) {
          throw Object.assign(new Error(`Stock insuficiente para "${prod.nombre}"`), { statusCode: 400 });
        }

        const precioUnitario = item.precio_unitario;
        const precioTotal = precioUnitario * item.cantidad;

        const itemResult = await client.query(
          `INSERT INTO venta_items (id, venta_id, producto_id, nombre_producto, cantidad, precio_unitario, precio_total, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
           RETURNING *`,
          [generarId(), venta.id, item.producto_id, prod.nombre, item.cantidad, precioUnitario, precioTotal]
        );
        items.push(itemResult.rows[0]);

        // Descontar stock
        await client.query(
          `UPDATE productos SET stock = stock - $1, updated_at = NOW() WHERE id = $2`,
          [item.cantidad, item.producto_id]
        );
      }

      await client.query('COMMIT');
      return { ...venta, items };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async findAll(empresaId: string): Promise<Venta[]> {
    const result = await pool.query(
      `SELECT v.*, c.nombre AS cliente_nombre, u.nombre AS vendedor_nombre
       FROM ventas v
       LEFT JOIN clientes c ON c.id = v.cliente_id
       JOIN usuarios u ON u.id = v.vendedor_id
       WHERE v.empresa_id = $1
       ORDER BY v.created_at DESC`,
      [empresaId]
    );
    return result.rows;
  }
}
