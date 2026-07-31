import { Pool } from 'pg';
import { FinanzasFilters, FinanzasSummary, EntradaFinanzas } from '../../domain/entities/Finanzas';
import { IFinanzasRepository } from '../../domain/repositories/IFinanzasRepository';
import { calcularComisionProducto } from '../../shared/utils/calculos.utils';
import { normalizarCanjeDetalle } from '../../shared/utils/canje.utils';

export class PostgresFinanzasRepository implements IFinanzasRepository {
  constructor(private pool: Pool) {}

  async getEntradasPaginadas(
    profesionalId: string,
    empresaId: string,
    filters: FinanzasFilters
  ): Promise<{ items: EntradaFinanzas[]; total: number }> {
    const params: any[] = [profesionalId, empresaId, filters.fecha_desde, filters.fecha_hasta];
    let paramIdx = 5;

    // Qué ramas del UNION participan según el tab
    const incluirTurnos = filters.tipo !== 'productos';
    const incluirVentas = filters.tipo !== 'turnos';

    // WHERE compartido para ambas fuentes ($1-$4 iguales)
    const whereTurnos: string[] = [
      'ct.profesional_id = $1',
      'ct.empresa_id = $2',
      't.fecha BETWEEN $3 AND $4',
    ];
    // Para ventas vinculadas a un turno se usa la fecha del turno; para ventas directas, created_at
    const whereVentas: string[] = [
      'vp.vendedor_id = $1',
      'vp.empresa_id = $2',
      "COALESCE(trn.fecha, DATE(vp.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')) BETWEEN $3 AND $4",
    ];

    if (filters.tipo === 'pendientes') {
      // El tab Pendientes pisa el filtro de método de pago
      whereTurnos.push(`t.metodo_pago = 'pendiente'`);
      whereVentas.push(`vp.metodo_pago = 'pendiente'`);
    } else if (filters.metodo_pago !== 'todos') {
      whereTurnos.push(`t.metodo_pago = $${paramIdx}`);
      whereVentas.push(`vp.metodo_pago = $${paramIdx}`);
      params.push(filters.metodo_pago);
      paramIdx++;
    }

    if (filters.estado_comision !== 'todos' && incluirTurnos) {
      // Solo aplica a comisiones, no a ventas directas.
      // Si la rama de turnos no participa, no se agrega el parámetro: un bind sin referencia en el SQL es error de Postgres.
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

    // CTE de ventas agrupadas — solo se incluye si la rama de ventas participa
    const vaCte = `va AS (
        SELECT
          COALESCE(vp.venta_grupo_id, vp.id)                                                         AS grupo_id,
          MIN(vp.turno_id)                                                                            AS turno_id,
          COALESCE(MIN(trn.fecha), DATE(MIN(vp.created_at) AT TIME ZONE 'America/Argentina/Buenos_Aires')) AS fecha,
          MIN(vp.metodo_pago)                                                                         AS metodo_pago,
          SUM(vp.precio_total)                                                                        AS total,
          SUM(vp.comision_monto)                                                                      AS comision_monto,
          SUM(vp.neto_vendedor)                                                                       AS neto_vendedor,
          MIN(c.nombre)                                                                               AS cliente_nombre,
          MIN(u.nombre)                                                                               AS vendedor_nombre,
          MIN(vp.canje_detalle)                                                                       AS canje_detalle,
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
        LEFT JOIN turnos trn ON trn.id = vp.turno_id
        WHERE ${whereVentas.join(' AND ')}
        GROUP BY COALESCE(vp.venta_grupo_id, vp.id), vp.empresa_id
      )`;

    const turnosBranch = `
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
            'canje_detalle',                t.canje_detalle,
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
            'updated_at',                   ct.updated_at,
            'tiene_producto_pendiente',     EXISTS (
              SELECT 1 FROM venta_productos vpp
              WHERE vpp.turno_id = ct.turno_id
                AND vpp.empresa_id = ct.empresa_id
                AND vpp.metodo_pago = 'pendiente'
            )
          ) AS entry
        FROM comisiones_turno ct
        JOIN  turnos   t ON ct.turno_id    = t.id
        JOIN  clientes c ON t.cliente_id   = c.id
        LEFT JOIN servicios s ON t.servicio_id  = s.id
        LEFT JOIN usuarios  u ON ct.profesional_id = u.id
        WHERE ${whereTurnos.join(' AND ')}`;

    const ventasBranch = `
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
            'canje_detalle',   va.canje_detalle,
            'total',           va.total,
            'comision_monto',  va.comision_monto,
            'neto_vendedor',   va.neto_vendedor,
            'cliente_nombre',  va.cliente_nombre,
            'vendedor_nombre', va.vendedor_nombre,
            'empresa_id',      va.empresa_id,
            'items',           va.items
          ) AS entry
        FROM va`;

    const branches = [
      ...(incluirTurnos ? [turnosBranch] : []),
      ...(incluirVentas ? [ventasBranch] : []),
    ].join('\n        UNION ALL\n');

    const query = `
      WITH ${incluirVentas ? `${vaCte},` : ''} combined AS (${branches}
      )
      SELECT entry
      FROM combined
      ORDER BY ${orderCol} ${orderDir}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    // COUNT sobre el mismo UNION (sin LIMIT/OFFSET), con las mismas ramas y WHERE
    const countParams = params.slice(0, -2);
    const countTurnos = `(
        SELECT COUNT(*)
        FROM comisiones_turno ct
        JOIN turnos t ON ct.turno_id = t.id
        WHERE ${whereTurnos.join(' AND ')}
      )`;
    const countVentas = `(
        SELECT COUNT(*) FROM va
      )`;
    const countParts = [
      ...(incluirTurnos ? [countTurnos] : []),
      ...(incluirVentas ? [countVentas] : []),
    ].join(' + ');
    const countQuery = `
      ${incluirVentas ? `WITH va AS (
        SELECT COALESCE(vp.venta_grupo_id, vp.id) AS grupo_id
        FROM venta_productos vp
        LEFT JOIN turnos trn ON trn.id = vp.turno_id
        WHERE ${whereVentas.join(' AND ')}
        GROUP BY COALESCE(vp.venta_grupo_id, vp.id), vp.empresa_id
      )` : ''}
      SELECT ${countParts} AS total
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
    } else {
      // Los pendientes no cuentan como vendido hasta que se cobren.
      // Los canjes (importes 0) tampoco: no deben inflar cantidades ni promedios.
      whereServicios.push(`t.metodo_pago NOT IN ('pendiente', 'canje')`);
    }
    if (filters.estado_comision !== 'todos') {
      whereServicios.push(`ct.estado = $${si}`);
      sParams.push(filters.estado_comision);
    }

    const whereProductos = [
      'vp.vendedor_id = $1',
      'vp.empresa_id = $2',
      "COALESCE(trn.fecha, DATE(vp.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')) BETWEEN $3 AND $4"
    ];
    const pParams: any[] = [profesionalId, empresaId, filters.fecha_desde, filters.fecha_hasta];
    if (filters.metodo_pago !== 'todos') {
      whereProductos.push(`vp.metodo_pago = $${pParams.length + 1}`);
      pParams.push(filters.metodo_pago);
    } else {
      // Los pendientes no cuentan como vendido hasta que se cobren.
      // Los canjes (importes 0) tampoco: no deben inflar cantidades ni promedios.
      whereProductos.push(`vp.metodo_pago NOT IN ('pendiente', 'canje')`);
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
        LEFT JOIN turnos trn ON trn.id = vp.turno_id
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
    const [pendTResult, pendVResult, canjeTResult, canjeVResult] = await Promise.all([
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
        LEFT JOIN turnos trn ON trn.id = vp.turno_id
        WHERE vp.vendedor_id = $1 AND vp.empresa_id = $2
          AND COALESCE(trn.fecha, DATE(vp.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')) BETWEEN $3 AND $4
          AND vp.metodo_pago = 'pendiente'
      `, baseParams),
      // Canjes: siempre con los mismos filtros de fecha/profesional/empresa, ignorando el filtro de método
      this.pool.query(`
        SELECT COUNT(*) AS cantidad_canjes
        FROM comisiones_turno ct
        JOIN turnos t ON ct.turno_id = t.id
        WHERE ct.profesional_id = $1 AND ct.empresa_id = $2
          AND t.fecha BETWEEN $3 AND $4 AND t.metodo_pago = 'canje'
      `, baseParams),
      this.pool.query(`
        SELECT COALESCE(SUM(vp.cantidad), 0) AS cantidad_canjes
        FROM venta_productos vp
        LEFT JOIN turnos trn ON trn.id = vp.turno_id
        WHERE vp.vendedor_id = $1 AND vp.empresa_id = $2
          AND COALESCE(trn.fecha, DATE(vp.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')) BETWEEN $3 AND $4
          AND vp.metodo_pago = 'canje'
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
      cantidad_canjes_servicios: parseInt(canjeTResult.rows[0].cantidad_canjes) || 0,
      cantidad_canjes_productos: parseInt(canjeVResult.rows[0].cantidad_canjes) || 0,
    };
  }

  async cobrarPago(
    tipo: 'turno' | 'turno_solo_servicio' | 'venta_turno' | 'venta',
    id: string,
    empresaId: string,
    metodoPago: 'efectivo' | 'transferencia' | 'tarjeta' | 'canje',
    metodoPagoProductos?: 'efectivo' | 'transferencia' | 'tarjeta' | 'canje',
    canjeDetalle?: string | null
  ): Promise<void> {
    // Un solo detalle por operación: el mismo texto va al turno (si el servicio es canje)
    // y/o a todos los productos cobrados como canje. Con métodos no-canje vuelve a NULL.
    const detalle = normalizarCanjeDetalle(canjeDetalle);

    if (tipo === 'turno') {
      // Actualiza turno Y todos sus productos (caso sin productos pendientes separados)
      await this._cobrarServicioDeTurno(id, empresaId, metodoPago, detalle);
      const metodoProd = metodoPagoProductos ?? metodoPago;
      await this._actualizarProductosDeTurno(id, empresaId, metodoProd, detalle);

    } else if (tipo === 'turno_solo_servicio') {
      // Solo actualiza el turno — los productos se cobran por separado desde su propia fila
      await this._cobrarServicioDeTurno(id, empresaId, metodoPago, detalle);

    } else if (tipo === 'venta_turno') {
      // Solo actualiza venta_productos del turno — no toca turnos.metodo_pago
      await this._actualizarProductosDeTurno(id, empresaId, metodoPago, detalle);

    } else {
      // Venta directa: actualiza por venta_grupo_id.
      // Canje = entrega gratis: además del método, se zerean todos los importes.
      if (metodoPago === 'canje') {
        await this.pool.query(
          `UPDATE venta_productos
           SET metodo_pago = 'canje', precio_unitario = 0, precio_total = 0,
               neto_vendedor = 0, comision_monto = 0, canje_detalle = $3, updated_at = NOW()
           WHERE venta_grupo_id = $1 AND empresa_id = $2`,
          [id, empresaId, detalle]
        );
      } else {
        await this.pool.query(
          `UPDATE venta_productos SET metodo_pago = $1, canje_detalle = NULL, updated_at = NOW()
           WHERE venta_grupo_id = $2 AND empresa_id = $3`,
          [metodoPago, id, empresaId]
        );
      }
    }
  }

  // Cobra el servicio de un turno. Canje = servicio gratis: total_final del turno en 0,
  // los montos del servicio en comisiones_turno también en 0 y se guarda canje_detalle.
  // Con métodos no-canje, canje_detalle vuelve a NULL.
  private async _cobrarServicioDeTurno(
    turnoId: string,
    empresaId: string,
    metodoPago: 'efectivo' | 'transferencia' | 'tarjeta' | 'canje',
    canjeDetalle: string | null = null
  ): Promise<void> {
    if (metodoPago === 'canje') {
      await this.pool.query(
        `UPDATE turnos SET metodo_pago = 'canje', total_final = 0, canje_detalle = $3, updated_at = NOW()
         WHERE id = $1 AND empresa_id = $2`,
        [turnoId, empresaId, canjeDetalle]
      );
      await this.pool.query(
        `UPDATE comisiones_turno
         SET servicio_monto = 0, servicio_comision_monto = 0, servicio_neto_profesional = 0, updated_at = NOW()
         WHERE turno_id = $1 AND empresa_id = $2`,
        [turnoId, empresaId]
      );
    } else {
      await this.pool.query(
        `UPDATE turnos SET metodo_pago = $1, canje_detalle = NULL, updated_at = NOW() WHERE id = $2 AND empresa_id = $3`,
        [metodoPago, turnoId, empresaId]
      );
    }
  }

  private async _actualizarProductosDeTurno(
    turnoId: string,
    empresaId: string,
    metodo: 'efectivo' | 'transferencia' | 'tarjeta' | 'canje',
    canjeDetalle: string | null = null
  ): Promise<void> {
    // Canje = entrega gratis: NO se usa el precio por config; todos los importes en 0
    // (con y sin catálogo). El costo_unitario_snapshot queda como está (informativo).
    if (metodo === 'canje') {
      await this.pool.query(
        `UPDATE venta_productos
         SET metodo_pago = 'canje', precio_unitario = 0, precio_total = 0,
             neto_vendedor = 0, comision_monto = 0, canje_detalle = $3, updated_at = NOW()
         WHERE turno_id = $1 AND empresa_id = $2`,
        [turnoId, empresaId, canjeDetalle]
      );
      return;
    }

    // Productos con catálogo: recalcular precio según método de pago.
    // Los precios NULL del catálogo se derivan de la configuración (costo × (1 + pct/100)).
    // La comisión se recalcula sobre la GANANCIA (precio − costo), igual que al crear la venta.
    const { rows } = await this.pool.query(
      `SELECT vp.id, vp.cantidad, vp.comision_porcentaje, vp.precio_unitario, vp.precio_total,
              vp.es_venta_costo, vp.costo_unitario_snapshot,
              COALESCE(p.precio_efectivo,      ROUND(p.costo * (1 + COALESCE(cfg.pct_efectivo, 0)      / 100), 2)) AS precio_efectivo,
              COALESCE(p.precio_transferencia, ROUND(p.costo * (1 + COALESCE(cfg.pct_transferencia, 0) / 100), 2)) AS precio_transferencia,
              COALESCE(p.precio_tarjeta,       ROUND(p.costo * (1 + COALESCE(cfg.pct_tarjeta, 0)       / 100), 2)) AS precio_tarjeta,
              p.costo AS costo_catalogo
       FROM venta_productos vp
       JOIN productos p ON p.id = vp.producto_id
       LEFT JOIN configuracion_productos cfg ON cfg.empresa_id = vp.empresa_id
       WHERE vp.turno_id = $1 AND vp.empresa_id = $2`,
      [turnoId, empresaId]
    );

    for (const row of rows) {
      let precioUnitario = Number(row.precio_unitario);
      // La venta al costo conserva su precio; el resto toma el precio del método elegido
      if (!row.es_venta_costo) {
        const precioMetodo = metodo === 'transferencia' ? row.precio_transferencia
          : metodo === 'tarjeta' ? row.precio_tarjeta
          : row.precio_efectivo;
        if (precioMetodo != null && Number(precioMetodo) > 0) precioUnitario = Number(precioMetodo);
      }
      const precioTotal = precioUnitario * row.cantidad;
      const costoUnitario = row.costo_unitario_snapshot != null
        ? Number(row.costo_unitario_snapshot)
        : (row.costo_catalogo != null ? Number(row.costo_catalogo) : null);
      const { netoVendedor, comisionMonto } = calcularComisionProducto(
        precioTotal, costoUnitario, row.cantidad, Number(row.comision_porcentaje)
      );

      await this.pool.query(
        `UPDATE venta_productos
         SET metodo_pago = $1, precio_unitario = $2, precio_total = $3,
             neto_vendedor = $4, comision_monto = $5, canje_detalle = NULL, updated_at = NOW()
         WHERE id = $6`,
        [metodo, precioUnitario, precioTotal, netoVendedor, comisionMonto, row.id]
      );
    }

    // Productos sin catálogo (custom): solo actualizar método (y limpiar canje_detalle)
    await this.pool.query(
      `UPDATE venta_productos SET metodo_pago = $1, canje_detalle = NULL, updated_at = NOW()
       WHERE turno_id = $2 AND empresa_id = $3 AND producto_id IS NULL`,
      [metodo, turnoId, empresaId]
    );
  }
}
