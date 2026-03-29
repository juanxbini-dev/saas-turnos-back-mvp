import { Pool } from 'pg';
import { FinanzasFilters, FinanzasSummary, EntradaFinanzas } from '../../domain/entities/Finanzas';
import { IFinanzasRepository } from '../../domain/repositories/IFinanzasRepository';

export class PostgresFinanzasRepository implements IFinanzasRepository {
  constructor(private pool: Pool) {}

  async getEntradasPaginadas(
    profesionalId: string,
    empresaId: string,
    filters: FinanzasFilters
  ): Promise<{ items: EntradaFinanzas[]; total: number }> {
    const params: any[] = [profesionalId, empresaId, filters.fecha_desde, filters.fecha_hasta];
    let paramIdx = 5;

    // WHERE compartido para ambas fuentes ($1-$4 iguales)
    const whereTurnos: string[] = [
      'ct.profesional_id = $1',
      'ct.empresa_id = $2',
      't.fecha BETWEEN $3 AND $4',
    ];
    const whereVentas: string[] = [
      'vp.vendedor_id = $1',
      'vp.empresa_id = $2',
      "DATE(vp.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires') BETWEEN $3 AND $4",
    ];

    if (filters.metodo_pago !== 'todos') {
      whereTurnos.push(`t.metodo_pago = $${paramIdx}`);
      whereVentas.push(`vp.metodo_pago = $${paramIdx}`);
      params.push(filters.metodo_pago);
      paramIdx++;
    }

    if (filters.estado_comision !== 'todos') {
      // Solo aplica a comisiones, no a ventas directas
      whereTurnos.push(`ct.estado = $${paramIdx}`);
      params.push(filters.estado_comision);
      paramIdx++;
    }

    const orderMap: Record<string, string> = {
      fecha: 'sort_fecha',
      total_venta: 'sort_monto',
      total_neto_profesional: 'sort_neto',
    };
    const orderCol = orderMap[filters.ordenar_por] || 'sort_fecha';
    const orderDir = filters.orden.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const limitIdx = paramIdx++;
    const offsetIdx = paramIdx++;
    params.push(filters.por_pagina, (filters.pagina - 1) * filters.por_pagina);

    const query = `
      WITH va AS (
        SELECT
          COALESCE(vp.venta_grupo_id, vp.id)                            AS grupo_id,
          MIN(vp.turno_id)                                              AS turno_id,
          DATE(MIN(vp.created_at) AT TIME ZONE 'America/Argentina/Buenos_Aires') AS fecha,
          MIN(vp.metodo_pago)                                           AS metodo_pago,
          SUM(vp.precio_total)                                          AS total,
          SUM(vp.comision_monto)                                        AS comision_monto,
          SUM(vp.neto_vendedor)                                         AS neto_vendedor,
          MIN(c.nombre)                                                 AS cliente_nombre,
          MIN(u.nombre)                                                 AS vendedor_nombre,
          vp.empresa_id,
          JSON_AGG(
            JSON_BUILD_OBJECT(
              'id',                  vp.id,
              'nombre_producto',     vp.nombre_producto,
              'cantidad',            vp.cantidad,
              'precio_total',        vp.precio_total,
              'comision_porcentaje', vp.comision_porcentaje,
              'comision_monto',      vp.comision_monto,
              'neto_vendedor',       vp.neto_vendedor
            ) ORDER BY vp.created_at
          ) AS items
        FROM venta_productos vp
        JOIN  usuarios u ON u.id = vp.vendedor_id
        LEFT JOIN clientes c ON c.id = vp.cliente_id
        WHERE ${whereVentas.join(' AND ')}
        GROUP BY COALESCE(vp.venta_grupo_id, vp.id), vp.empresa_id
      ),
      combined AS (
        SELECT
          t.fecha::text                          AS sort_fecha,
          t.hora::text                           AS sort_hora,
          ct.servicio_monto::numeric             AS sort_monto,
          ct.servicio_neto_profesional::numeric  AS sort_neto,
          JSONB_BUILD_OBJECT(
            'tipo',                         'turno',
            'id',                           ct.id,
            'turno_id',                     ct.turno_id,
            'profesional_id',               ct.profesional_id,
            'empresa_id',                   ct.empresa_id,
            'turno_fecha',                  t.fecha,
            'turno_hora',                   t.hora,
            'turno_estado',                 t.estado,
            'metodo_pago',                  t.metodo_pago,
            'precio_original',              t.precio_original,
            'descuento_porcentaje',         t.descuento_porcentaje,
            'descuento_monto',              t.descuento_monto,
            'total_final',                  t.total_final,
            'servicio_monto',               ct.servicio_monto,
            'servicio_comision_porcentaje', ct.servicio_comision_porcentaje,
            'servicio_comision_monto',      ct.servicio_comision_monto,
            'servicio_neto_profesional',    ct.servicio_neto_profesional,
            'estado',                       ct.estado,
            'fecha_pago',                   ct.fecha_pago,
            'notas',                        ct.notas,
            'cliente_nombre',               c.nombre,
            'servicio_nombre',              s.nombre,
            'profesional_nombre',           u.nombre,
            'created_at',                   ct.created_at,
            'updated_at',                   ct.updated_at
          ) AS entry
        FROM comisiones_turno ct
        JOIN  turnos   t ON ct.turno_id    = t.id
        JOIN  clientes c ON t.cliente_id   = c.id
        LEFT JOIN servicios s ON t.servicio_id  = s.id
        LEFT JOIN usuarios  u ON ct.profesional_id = u.id
        WHERE ${whereTurnos.join(' AND ')}

        UNION ALL

        SELECT
          va.fecha::text         AS sort_fecha,
          '00:00'::text          AS sort_hora,
          va.total::numeric      AS sort_monto,
          va.neto_vendedor::numeric AS sort_neto,
          JSONB_BUILD_OBJECT(
            'tipo',            'venta_producto',
            'id',              va.grupo_id,
            'venta_grupo_id',  va.grupo_id,
            'turno_id',        va.turno_id,
            'fecha',           va.fecha,
            'metodo_pago',     va.metodo_pago,
            'total',           va.total,
            'comision_monto',  va.comision_monto,
            'neto_vendedor',   va.neto_vendedor,
            'cliente_nombre',  va.cliente_nombre,
            'vendedor_nombre', va.vendedor_nombre,
            'empresa_id',      va.empresa_id,
            'items',           va.items
          ) AS entry
        FROM va
      )
      SELECT entry
      FROM combined
      ORDER BY ${orderCol} ${orderDir}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    // COUNT sobre el mismo UNION (sin LIMIT/OFFSET)
    const countParams = params.slice(0, -2);
    const countQuery = `
      WITH va AS (
        SELECT COALESCE(vp.venta_grupo_id, vp.id) AS grupo_id
        FROM venta_productos vp
        WHERE ${whereVentas.join(' AND ')}
        GROUP BY COALESCE(vp.venta_grupo_id, vp.id), vp.empresa_id
      )
      SELECT (
        SELECT COUNT(*)
        FROM comisiones_turno ct
        JOIN turnos t ON ct.turno_id = t.id
        WHERE ${whereTurnos.join(' AND ')}
      ) + (
        SELECT COUNT(*) FROM va
      ) AS total
    `;

    const [result, countResult] = await Promise.all([
      this.pool.query(query, params),
      this.pool.query(countQuery, countParams),
    ]);

    return {
      items: result.rows.map(r => r.entry) as EntradaFinanzas[],
      total: parseInt(countResult.rows[0].total) || 0,
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
      await this.pool.query(
        `UPDATE venta_productos SET metodo_pago = $1, updated_at = NOW() WHERE venta_grupo_id = $2 AND empresa_id = $3`,
        [metodoPago, id, empresaId]
      );
    }
  }
}
