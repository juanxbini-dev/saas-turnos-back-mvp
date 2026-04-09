import { pool } from '../database/postgres.connection';
import { IVentaProductoRepository } from '../../domain/repositories/IVentaProductoRepository';
import { VentaProducto, CreateVentaProductoData } from '../../domain/entities/Comision';
import { generarId } from '../../shared/utils/calculos.utils';

export class PostgresVentaProductoRepository implements IVentaProductoRepository {
  async create(data: CreateVentaProductoData): Promise<VentaProducto> {
    const query = `
      INSERT INTO venta_productos (
        id, empresa_id, vendedor_id, cliente_id, turno_id, venta_grupo_id,
        producto_id, nombre_producto, cantidad, precio_unitario, precio_total,
        metodo_pago, comision_porcentaje, comision_monto, neto_vendedor,
        created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,NOW(),NOW())
      RETURNING *
    `;
    const result = await pool.query(query, [
      generarId(),
      data.empresa_id, data.vendedor_id, data.cliente_id ?? null,
      data.turno_id ?? null, data.venta_grupo_id ?? null,
      data.producto_id ?? null,
      data.nombre_producto, data.cantidad, data.precio_unitario, data.precio_total,
      data.metodo_pago ?? null,
      data.comision_porcentaje, data.comision_monto, data.neto_vendedor,
    ]);
    return result.rows[0];
  }

  async findByTurno(turnoId: string): Promise<VentaProducto[]> {
    const result = await pool.query(
      `SELECT * FROM venta_productos WHERE turno_id = $1 ORDER BY created_at ASC`,
      [turnoId]
    );
    return result.rows;
  }

  async findByTurnoWithPrices(turnoId: string, empresaId: string): Promise<any[]> {
    const result = await pool.query(
      `SELECT vp.id, vp.producto_id, vp.nombre_producto, vp.cantidad,
              vp.precio_unitario, vp.precio_total, vp.metodo_pago,
              p.precio_efectivo, p.precio_transferencia
       FROM venta_productos vp
       LEFT JOIN productos p ON p.id = vp.producto_id
       WHERE vp.turno_id = $1 AND vp.empresa_id = $2
       ORDER BY vp.created_at ASC`,
      [turnoId, empresaId]
    );
    return result.rows;
  }

  async deleteByTurno(turnoId: string): Promise<void> {
    await pool.query(`DELETE FROM venta_productos WHERE turno_id = $1`, [turnoId]);
  }

  async findByVendedor(vendedorId: string, empresaId: string, fechaDesde: string, fechaHasta: string): Promise<VentaProducto[]> {
    const result = await pool.query(
      `SELECT vp.*, u.nombre AS vendedor_nombre, c.nombre AS cliente_nombre
       FROM venta_productos vp
       JOIN usuarios u ON u.id = vp.vendedor_id
       LEFT JOIN clientes c ON c.id = vp.cliente_id
       WHERE vp.vendedor_id = $1
         AND vp.empresa_id = $2
         AND DATE(vp.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') BETWEEN $3 AND $4
       ORDER BY vp.created_at DESC`,
      [vendedorId, empresaId, fechaDesde, fechaHasta]
    );
    return result.rows;
  }
}
