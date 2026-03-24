import { Pool } from 'pg';
import { FinanzasFilters, FinanzasSummary, ComisionConDetalle, VentaDirectaFinanzas } from '../../domain/entities/Finanzas';
import { IFinanzasRepository } from '../../domain/repositories/IFinanzasRepository';
import { MetodoPago } from '../../domain/entities/Turno';

export class PostgresFinanzasRepository implements IFinanzasRepository {
  constructor(private pool: Pool) {}

  async getComisionesByProfesional(
    profesionalId: string,
    empresaId: string,
    filters: FinanzasFilters
  ): Promise<{ data: ComisionConDetalle[]; total: number }> {

    const whereConditions = [
      'ct.profesional_id = $1',
      'ct.empresa_id = $2',
      't.fecha BETWEEN $3 AND $4'
    ];
    const params: any[] = [profesionalId, empresaId, filters.fecha_desde, filters.fecha_hasta];
    let paramIndex = 5;

    if (filters.metodo_pago !== 'todos') {
      whereConditions.push(`t.metodo_pago = $${paramIndex}`);
      params.push(filters.metodo_pago);
      paramIndex++;
    }
    if (filters.estado_comision !== 'todos') {
      whereConditions.push(`ct.estado = $${paramIndex}`);
      params.push(filters.estado_comision);
      paramIndex++;
    }

    const orderByMap: Record<string, string> = {
      fecha: 't.fecha',
      total_venta: 'ct.servicio_monto',
      total_neto_profesional: 'ct.servicio_neto_profesional'
    };
    const orderField = orderByMap[filters.ordenar_por] || 't.fecha';
    const orderDirection = filters.orden.toUpperCase();

    const query = `
      SELECT
        ct.*,
        'turno' AS tipo,
        t.fecha AS turno_fecha,
        t.hora AS turno_hora,
        t.estado AS turno_estado,
        t.metodo_pago,
        t.precio_original,
        t.descuento_porcentaje,
        t.descuento_monto,
        t.total_final,
        c.nombre AS cliente_nombre,
        s.nombre AS servicio_nombre,
        u.nombre AS profesional_nombre
      FROM comisiones_turno ct
      JOIN turnos t ON ct.turno_id = t.id
      JOIN clientes c ON t.cliente_id = c.id
      LEFT JOIN servicios s ON t.servicio_id = s.id
      LEFT JOIN usuarios u ON ct.profesional_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${orderField} ${orderDirection}, t.hora ${orderDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(filters.por_pagina, (filters.pagina - 1) * filters.por_pagina);

    const countQuery = `
      SELECT COUNT(*) as total
      FROM comisiones_turno ct
      JOIN turnos t ON ct.turno_id = t.id
      WHERE ${whereConditions.join(' AND ')}
    `;
    const countParams = params.slice(0, -2);

    const [result, countResult] = await Promise.all([
      this.pool.query(query, params),
      this.pool.query(countQuery, countParams),
    ]);

    return {
      data: result.rows as ComisionConDetalle[],
      total: parseInt(countResult.rows[0].total),
    };
  }

  async getFinanzasSummary(
    profesionalId: string,
    empresaId: string,
    filters: FinanzasFilters
  ): Promise<FinanzasSummary> {

    const whereServicios = [
      'ct.profesional_id = $1',
      'ct.empresa_id = $2',
      't.fecha BETWEEN $3 AND $4'
    ];
    const sParams: any[] = [profesionalId, empresaId, filters.fecha_desde, filters.fecha_hasta];
    let si = 5;

    if (filters.metodo_pago !== 'todos') {
      whereServicios.push(`t.metodo_pago = $${si}`);
      sParams.push(filters.metodo_pago);
      si++;
    }
    if (filters.estado_comision !== 'todos') {
      whereServicios.push(`ct.estado = $${si}`);
      sParams.push(filters.estado_comision);
    }

    const whereProductos = [
      'vp.vendedor_id = $1',
      'vp.empresa_id = $2',
      "DATE(vp.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') BETWEEN $3 AND $4"
    ];
    const pParams: any[] = [profesionalId, empresaId, filters.fecha_desde, filters.fecha_hasta];
    if (filters.metodo_pago !== 'todos') {
      whereProductos.push(`vp.metodo_pago = $${pParams.length + 1}`);
      pParams.push(filters.metodo_pago);
    }

    const [sResult, pResult] = await Promise.all([
      this.pool.query(`
        SELECT
          COALESCE(SUM(ct.servicio_monto), 0)            AS total_venta_servicios,
          COALESCE(SUM(ct.servicio_comision_monto), 0)   AS total_comision_empresa_servicios,
          COALESCE(SUM(ct.servicio_neto_profesional), 0) AS total_neto_profesional_servicios,
          COALESCE(SUM(t.descuento_monto), 0)            AS total_descuentos,
          COUNT(*)                                       AS cantidad_turnos
        FROM comisiones_turno ct
        JOIN turnos t ON ct.turno_id = t.id
        WHERE ${whereServicios.join(' AND ')}
      `, sParams),
      this.pool.query(`
        SELECT
          COALESCE(SUM(vp.precio_total), 0)   AS total_venta_productos,
          COALESCE(SUM(vp.comision_monto), 0) AS total_comision_empresa_productos,
          COALESCE(SUM(vp.neto_vendedor), 0)  AS total_neto_profesional_productos,
          COUNT(*)                            AS cantidad_productos_vendidos
        FROM venta_productos vp
        WHERE ${whereProductos.join(' AND ')}
      `, pParams),
    ]);

    const s = sResult.rows[0];
    const p = pResult.rows[0];

    const tvs  = parseFloat(s.total_venta_servicios) || 0;
    const tvp  = parseFloat(p.total_venta_productos) || 0;
    const tces = parseFloat(s.total_comision_empresa_servicios) || 0;
    const tcep = parseFloat(p.total_comision_empresa_productos) || 0;
    const tnps = parseFloat(s.total_neto_profesional_servicios) || 0;
    const tnpp = parseFloat(p.total_neto_profesional_productos) || 0;
    const ct   = parseInt(s.cantidad_turnos) || 0;

    // Total pendiente (sin aplicar filtros de metodo_pago/estado)
    const baseParams = [profesionalId, empresaId, filters.fecha_desde, filters.fecha_hasta];
    const [pendTResult, pendVResult] = await Promise.all([
      this.pool.query(`
        SELECT COALESCE(SUM(t.total_final), 0) AS total_pendiente
        FROM comisiones_turno ct
        JOIN turnos t ON ct.turno_id = t.id
        WHERE ct.profesional_id = $1 AND ct.empresa_id = $2
          AND t.fecha BETWEEN $3 AND $4 AND t.metodo_pago = 'pendiente'
      `, baseParams),
      this.pool.query(`
        SELECT COALESCE(SUM(vp.precio_total), 0) AS total_pendiente
        FROM venta_productos vp
        WHERE vp.vendedor_id = $1 AND vp.empresa_id = $2
          AND DATE(vp.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') BETWEEN $3 AND $4
          AND vp.metodo_pago = 'pendiente'
      `, baseParams),
    ]);

    return {
      total_venta: tvs + tvp,
      total_venta_servicios: tvs,
      total_venta_productos: tvp,
      total_comision_empresa: tces + tcep,
      total_comision_empresa_servicios: tces,
      total_comision_empresa_productos: tcep,
      total_neto_profesional: tnps + tnpp,
      total_neto_profesional_servicios: tnps,
      total_neto_profesional_productos: tnpp,
      total_descuentos: parseFloat(s.total_descuentos) || 0,
      cantidad_turnos: ct,
      cantidad_productos_vendidos: parseInt(p.cantidad_productos_vendidos) || 0,
      promedio_por_turno: ct > 0 ? (tvs + tvp) / ct : 0,
      total_pendiente: (parseFloat(pendTResult.rows[0].total_pendiente) || 0) + (parseFloat(pendVResult.rows[0].total_pendiente) || 0),
    };
  }

  async getVentasDirectas(
    vendedorId: string,
    empresaId: string,
    filters: FinanzasFilters
  ): Promise<{ data: VentaDirectaFinanzas[]; total: number }> {

    const whereConditions = [
      'vp.vendedor_id = $1',
      'vp.empresa_id = $2',
      "DATE(vp.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') BETWEEN $3 AND $4"
    ];
    const params: any[] = [vendedorId, empresaId, filters.fecha_desde, filters.fecha_hasta];
    let paramIndex = 5;

    if (filters.metodo_pago !== 'todos') {
      whereConditions.push(`vp.metodo_pago = $${paramIndex}`);
      params.push(filters.metodo_pago);
      paramIndex++;
    }

    const whereClause = whereConditions.join(' AND ');

    const [result, countResult] = await Promise.all([
      this.pool.query(`
        SELECT
          'venta_producto' AS tipo,
          vp.id,
          TO_CHAR(vp.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD') AS fecha,
          vp.turno_id,
          vp.venta_grupo_id,
          vp.metodo_pago,
          vp.precio_total AS total,
          vp.comision_porcentaje,
          vp.comision_monto,
          vp.neto_vendedor,
          vp.nombre_producto,
          vp.cantidad,
          vp.empresa_id,
          c.nombre AS cliente_nombre,
          u.nombre AS vendedor_nombre
        FROM venta_productos vp
        JOIN usuarios u ON u.id = vp.vendedor_id
        LEFT JOIN clientes c ON c.id = vp.cliente_id
        WHERE ${whereClause}
        ORDER BY vp.created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `, [...params, filters.por_pagina, (filters.pagina - 1) * filters.por_pagina]),
      this.pool.query(
        `SELECT COUNT(*) AS total FROM venta_productos vp WHERE ${whereClause}`,
        params
      ),
    ]);

    return {
      data: result.rows as VentaDirectaFinanzas[],
      total: parseInt(countResult.rows[0].total) || 0,
    };
  }

  async cobrarPago(
    tipo: 'turno' | 'venta',
    id: string,
    empresaId: string,
    metodoPago: 'efectivo' | 'transferencia'
  ): Promise<void> {
    if (tipo === 'turno') {
      await this.pool.query(
        `UPDATE turnos SET metodo_pago = $1, updated_at = NOW() WHERE id = $2 AND empresa_id = $3`,
        [metodoPago, id, empresaId]
      );
      await this.pool.query(
        `UPDATE venta_productos SET metodo_pago = $1, updated_at = NOW() WHERE turno_id = $2 AND empresa_id = $3`,
        [metodoPago, id, empresaId]
      );
    } else {
      // id = venta_grupo_id
      await this.pool.query(
        `UPDATE venta_productos SET metodo_pago = $1, updated_at = NOW() WHERE venta_grupo_id = $2 AND empresa_id = $3`,
        [metodoPago, id, empresaId]
      );
    }
  }
}
