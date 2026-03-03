import { pool } from '../database/postgres.connection';
import { IVentaProductoRepository } from '../../domain/repositories/IVentaProductoRepository';
import { VentaProducto, CreateVentaProductoData } from '../../domain/entities/Comision';
import { generarId } from '../../shared/utils/calculos.utils';

export class PostgresVentaProductoRepository implements IVentaProductoRepository {
  async create(data: CreateVentaProductoData): Promise<VentaProducto> {
    const query = `
      INSERT INTO venta_productos (
        id, turno_id, producto_id, nombre_producto, cantidad, precio_unitario, precio_total, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING *
    `;
    
    const result = await pool.query(query, [
      generarId(),
      data.turno_id,
      data.producto_id,
      data.nombre_producto,
      data.cantidad,
      data.precio_unitario,
      data.precio_total
    ]);
    
    return result.rows[0];
  }

  async findByTurno(turnoId: string): Promise<VentaProducto[]> {
    const query = `
      SELECT * FROM venta_productos 
      WHERE turno_id = $1
      ORDER BY created_at ASC
    `;
    
    const result = await pool.query(query, [turnoId]);
    return result.rows;
  }

  async deleteByTurno(turnoId: string): Promise<void> {
    const query = `
      DELETE FROM venta_productos 
      WHERE turno_id = $1
    `;
    
    await pool.query(query, [turnoId]);
  }
}
