import { pool } from '../database/postgres.connection';
import { IVentaProductoRepository, VentaProductoFiltros, VentaProductoConVendedor, UpdateVentaProductoData, ResumenTotalesVentas, ResumenProfesional, ResumenProducto } from '../../domain/repositories/IVentaProductoRepository';
import { VentaProducto, CreateVentaProductoData } from '../../domain/entities/Comision';
import { generarId } from '../../shared/utils/calculos.utils';

export class PostgresVentaProductoRepository implements IVentaProductoRepository {
  async create(data: CreateVentaProductoData): Promise<VentaProducto> {
    const query = `
      INSERT INTO venta_productos (
        id, empresa_id, vendedor_id, cliente_id, turno_id, venta_grupo_id,
        producto_id, nombre_producto, cantidad, precio_unitario, precio_total,
        metodo_pago, comision_porcentaje, comision_monto, neto_vendedor,
        fecha_venta, es_venta_costo, costo_unitario_snapshot, canje_detalle,
        created_at, updated_at
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,NOW(),NOW())
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
      data.fecha_venta ?? null,
      data.es_venta_costo ?? false,
      data.costo_unitario_snapshot ?? null,
      data.canje_detalle ?? null,
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
    // Precio NULL en productos = derivado de la configuración (costo × (1 + pct/100))
    const result = await pool.query(
      `SELECT vp.id, vp.producto_id, vp.nombre_producto, vp.cantidad,
              vp.precio_unitario, vp.precio_total, vp.metodo_pago, vp.canje_detalle,
              COALESCE(p.precio_efectivo,      ROUND(p.costo * (1 + COALESCE(cfg.pct_efectivo, 0)      / 100), 2)) AS precio_efectivo,
              COALESCE(p.precio_transferencia, ROUND(p.costo * (1 + COALESCE(cfg.pct_transferencia, 0) / 100), 2)) AS precio_transferencia,
              COALESCE(p.precio_tarjeta,       ROUND(p.costo * (1 + COALESCE(cfg.pct_tarjeta, 0)       / 100), 2)) AS precio_tarjeta
       FROM venta_productos vp
       LEFT JOIN productos p ON p.id = vp.producto_id
       LEFT JOIN configuracion_productos cfg ON cfg.empresa_id = vp.empresa_id
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
         AND vp.fecha_venta BETWEEN $3 AND $4
       ORDER BY vp.fecha_venta DESC`,
      [vendedorId, empresaId, fechaDesde, fechaHasta]
    );
    return result.rows;
  }

  async findAllPaginated(empresaId: string, params: VentaProductoFiltros): Promise<{ rows: VentaProductoConVendedor[], total: number }> {
    const { fechaDesde, fechaHasta, vendedor_id, page, limit } = params;
    const offset = (page - 1) * limit;

    const baseParams: any[] = [empresaId, fechaDesde, fechaHasta];
    let vendedorFilter = '';

    if (vendedor_id) {
      baseParams.push(vendedor_id);
      vendedorFilter = `AND vp.vendedor_id = $${baseParams.length}`;
    }

    const dataParams = [...baseParams, limit, offset];

    const dataQuery = `
      SELECT vp.*, u.nombre AS vendedor_nombre, c.nombre AS cliente_nombre
      FROM venta_productos vp
      JOIN usuarios u ON u.id = vp.vendedor_id
      LEFT JOIN clientes c ON c.id = vp.cliente_id
      WHERE vp.empresa_id = $1
        AND vp.fecha_venta BETWEEN $2 AND $3
        ${vendedorFilter}
      ORDER BY vp.fecha_venta DESC, vp.created_at DESC
      LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
    `;

    const countQuery = `
      SELECT COUNT(*) AS total
      FROM venta_productos vp
      WHERE vp.empresa_id = $1
        AND vp.fecha_venta BETWEEN $2 AND $3
        ${vendedorFilter}
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, dataParams),
      pool.query(countQuery, baseParams),
    ]);

    return {
      rows: dataResult.rows,
      total: parseInt(countResult.rows[0].total, 10),
    };
  }

  async updateById(id: string, empresaId: string, data: UpdateVentaProductoData): Promise<VentaProducto> {
    // canje_detalle admite tres estados: undefined = no tocar (CASE con flag $14),
    // string = guardar, null = limpiar. COALESCE no sirve porque nunca podría volver a NULL.
    const query = `
      UPDATE venta_productos
      SET vendedor_id = COALESCE($3, vendedor_id),
          nombre_producto = COALESCE($4, nombre_producto),
          cantidad = COALESCE($5, cantidad),
          precio_unitario = COALESCE($6, precio_unitario),
          precio_total = COALESCE($7, precio_total),
          metodo_pago = COALESCE($8, metodo_pago),
          comision_monto = COALESCE($9, comision_monto),
          neto_vendedor = COALESCE($10, neto_vendedor),
          fecha_venta = COALESCE($11, fecha_venta),
          es_venta_costo = COALESCE($12, es_venta_costo),
          costo_unitario_snapshot = COALESCE($13, costo_unitario_snapshot),
          canje_detalle = CASE WHEN $14 THEN $15::text ELSE canje_detalle END,
          updated_at = NOW()
      WHERE id = $1 AND empresa_id = $2
      RETURNING *
    `;
    const result = await pool.query(query, [
      id,
      empresaId,
      data.vendedor_id ?? null,
      data.nombre_producto ?? null,
      data.cantidad ?? null,
      data.precio_unitario ?? null,
      data.precio_total ?? null,
      data.metodo_pago ?? null,
      data.comision_monto ?? null,
      data.neto_vendedor ?? null,
      data.fecha_venta ?? null,
      data.es_venta_costo ?? null,
      data.costo_unitario_snapshot ?? null,
      data.canje_detalle !== undefined,
      data.canje_detalle ?? null,
    ]);
    return result.rows[0] ?? null;
  }

  async getResumen(
    empresaId: string,
    fechaDesde: string,
    fechaHasta: string,
    vendedorId?: string
  ): Promise<{ totales: ResumenTotalesVentas; por_profesional: ResumenProfesional[]; por_producto: ResumenProducto[] }> {
    const baseParams: any[] = [empresaId, fechaDesde, fechaHasta];
    let vendedorFilter = '';
    if (vendedorId) {
      baseParams.push(vendedorId);
      vendedorFilter = `AND vp.vendedor_id = $${baseParams.length}`;
    }

    const porProfQuery = `
      WITH ventas_con_costo AS (
        SELECT
          vp.vendedor_id,
          vp.precio_total,
          vp.neto_vendedor,
          vp.comision_monto,
          COALESCE(vp.costo_unitario_snapshot, p.costo, 0) * vp.cantidad AS costo_item
        FROM venta_productos vp
        LEFT JOIN productos p ON p.id = vp.producto_id
        WHERE vp.empresa_id = $1
          AND vp.fecha_venta BETWEEN $2 AND $3
          AND vp.metodo_pago IS DISTINCT FROM 'canje'
          ${vendedorFilter}
      )
      SELECT
        u.id AS vendedor_id,
        u.nombre,
        CASE
          WHEN SUM(v.precio_total) > 0
            THEN ROUND(SUM(v.neto_vendedor) * 100.0 / SUM(v.precio_total), 2)
          ELSE 0
        END AS comision_producto,
        SUM(v.precio_total)                                AS total_ventas,
        SUM(v.costo_item)                                  AS costo_total,
        SUM(v.precio_total) - SUM(v.costo_item)            AS ganancia_bruta,
        SUM(v.neto_vendedor)                               AS ganancia_profesional,
        SUM(v.comision_monto) - SUM(v.costo_item)          AS ganancia_empresa
      FROM ventas_con_costo v
      JOIN usuarios u ON u.id = v.vendedor_id
      GROUP BY u.id, u.nombre
      ORDER BY total_ventas DESC
    `;

    const totalesQuery = `
      SELECT
        SUM(vp.precio_total)                                                                         AS total_ventas,
        SUM(CASE WHEN vp.metodo_pago = 'efectivo'      THEN vp.precio_total ELSE 0 END)             AS ingresos_efectivo,
        SUM(CASE WHEN vp.metodo_pago = 'transferencia' THEN vp.precio_total ELSE 0 END)             AS ingresos_transferencia,
        SUM(COALESCE(vp.costo_unitario_snapshot, p.costo, 0) * vp.cantidad)                         AS costo_total,
        SUM(vp.precio_total) - SUM(COALESCE(vp.costo_unitario_snapshot, p.costo, 0) * vp.cantidad) AS ganancia_bruta,
        SUM(vp.neto_vendedor)                                                                        AS ganancia_profesionales,
        SUM(vp.comision_monto) - SUM(COALESCE(vp.costo_unitario_snapshot, p.costo, 0) * vp.cantidad) AS ganancia_empresa
      FROM venta_productos vp
      LEFT JOIN productos p ON p.id = vp.producto_id
      WHERE vp.empresa_id = $1
        AND vp.fecha_venta BETWEEN $2 AND $3
        AND vp.metodo_pago IS DISTINCT FROM 'canje'
        ${vendedorFilter}
    `;

    const porProductoQuery = `
      SELECT
        vp.producto_id,
        vp.nombre_producto,
        SUM(vp.cantidad)::int                                                                   AS cantidad_total,
        SUM(vp.precio_total)                                                                    AS total_ventas,
        SUM(COALESCE(vp.costo_unitario_snapshot, p.costo, 0) * vp.cantidad)                    AS costo_total,
        SUM(vp.precio_total) - SUM(COALESCE(vp.costo_unitario_snapshot, p.costo, 0) * vp.cantidad) AS ganancia_bruta
      FROM venta_productos vp
      LEFT JOIN productos p ON p.id = vp.producto_id
      WHERE vp.empresa_id = $1
        AND vp.fecha_venta BETWEEN $2 AND $3
        AND vp.metodo_pago IS DISTINCT FROM 'canje'
        ${vendedorFilter}
      GROUP BY vp.producto_id, vp.nombre_producto
      ORDER BY total_ventas DESC
    `;

    const [profResult, totResult, prodResult] = await Promise.all([
      pool.query(porProfQuery, baseParams),
      pool.query(totalesQuery, baseParams),
      pool.query(porProductoQuery, baseParams),
    ]);

    const t = totResult.rows[0];
    return {
      totales: {
        total_ventas:           Number(t.total_ventas)           || 0,
        ingresos_efectivo:      Number(t.ingresos_efectivo)      || 0,
        ingresos_transferencia: Number(t.ingresos_transferencia) || 0,
        costo_total:            Number(t.costo_total)            || 0,
        ganancia_bruta:         Number(t.ganancia_bruta)         || 0,
        ganancia_profesionales: Number(t.ganancia_profesionales) || 0,
        ganancia_empresa:       Number(t.ganancia_empresa)       || 0,
      },
      por_profesional: profResult.rows.map(r => ({
        vendedor_id:          r.vendedor_id,
        nombre:               r.nombre,
        comision_producto:    Number(r.comision_producto)    || 0,
        total_ventas:         Number(r.total_ventas)         || 0,
        costo_total:          Number(r.costo_total)          || 0,
        ganancia_bruta:       Number(r.ganancia_bruta)       || 0,
        ganancia_profesional: Number(r.ganancia_profesional) || 0,
        ganancia_empresa:     Number(r.ganancia_empresa)     || 0,
      })),
      por_producto: prodResult.rows.map(r => ({
        producto_id:    r.producto_id,
        nombre_producto:r.nombre_producto,
        cantidad_total: Number(r.cantidad_total) || 0,
        total_ventas:   Number(r.total_ventas)   || 0,
        costo_total:    Number(r.costo_total)    || 0,
        ganancia_bruta: Number(r.ganancia_bruta) || 0,
      })),
    };
  }

  async deleteById(id: string, empresaId: string): Promise<void> {
    await pool.query(
      `DELETE FROM venta_productos WHERE id = $1 AND empresa_id = $2`,
      [id, empresaId]
    );
  }
}
