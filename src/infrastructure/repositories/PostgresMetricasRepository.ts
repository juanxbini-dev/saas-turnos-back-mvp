import { Pool } from 'pg';
import {
  MetricasPeriodo,
  MetricasResumen,
  MetricasAgrupacion,
  MetricasEvolucionPunto,
  MetricasEquipoItem,
} from '../../domain/entities/Metricas';
import { IMetricasRepository } from '../../domain/repositories/IMetricasRepository';

// Fecha efectiva de una venta de producto: fecha del turno si está vinculada,
// si no la fecha de creación en horario argentino (mismo criterio que PostgresFinanzasRepository)
const FECHA_VENTA = "COALESCE(trn.fecha, DATE(vp.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires'))";

export class PostgresMetricasRepository implements IMetricasRepository {
  constructor(private pool: Pool) {}

  async getResumen(empresaId: string, periodo: MetricasPeriodo): Promise<MetricasResumen> {
    const params = [empresaId, periodo.fecha_desde, periodo.fecha_hasta];

    const [servicios, productos, pendientes, turnos, clientes] = await Promise.all([
      // Facturación por servicios cobrados (los pendientes no cuentan hasta que se cobren)
      this.pool.query(`
        SELECT
          COALESCE(SUM(ct.servicio_monto), 0) AS total_venta_servicios,
          COUNT(*)                            AS turnos_cobrados
        FROM comisiones_turno ct
        JOIN turnos t ON ct.turno_id = t.id
        WHERE ct.empresa_id = $1
          AND t.fecha BETWEEN $2 AND $3
          AND t.metodo_pago != 'pendiente'
      `, params),

      // Facturación por productos cobrados
      this.pool.query(`
        SELECT
          COALESCE(SUM(vp.precio_total), 0) AS total_venta_productos,
          COUNT(*)                          AS cantidad_productos_vendidos
        FROM venta_productos vp
        LEFT JOIN turnos trn ON trn.id = vp.turno_id
        WHERE vp.empresa_id = $1
          AND ${FECHA_VENTA} BETWEEN $2 AND $3
          AND vp.metodo_pago != 'pendiente'
      `, params),

      // Pendiente de cobro (servicios + productos)
      this.pool.query(`
        SELECT (
          SELECT COALESCE(SUM(t.total_final), 0)
          FROM comisiones_turno ct
          JOIN turnos t ON ct.turno_id = t.id
          WHERE ct.empresa_id = $1
            AND t.fecha BETWEEN $2 AND $3
            AND t.metodo_pago = 'pendiente'
        ) + (
          SELECT COALESCE(SUM(vp.precio_total), 0)
          FROM venta_productos vp
          LEFT JOIN turnos trn ON trn.id = vp.turno_id
          WHERE vp.empresa_id = $1
            AND ${FECHA_VENTA} BETWEEN $2 AND $3
            AND vp.metodo_pago = 'pendiente'
        ) AS total_pendiente
      `, params),

      // Turnos por estado
      this.pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE estado = 'completado') AS completados,
          COUNT(*) FILTER (WHERE estado = 'cancelado')  AS cancelados
        FROM turnos
        WHERE empresa_id = $1 AND fecha BETWEEN $2 AND $3
      `, params),

      // Clientes activos en el período y clientes nuevos (primer turno dentro del período)
      this.pool.query(`
        SELECT
          (
            SELECT COUNT(DISTINCT t.cliente_id)
            FROM turnos t
            WHERE t.empresa_id = $1
              AND t.fecha BETWEEN $2 AND $3
              AND t.estado != 'cancelado'
              AND t.cliente_id IS NOT NULL
          ) AS clientes_activos,
          (
            SELECT COUNT(*)
            FROM (
              SELECT t.cliente_id, MIN(t.fecha) AS primera_visita
              FROM turnos t
              WHERE t.empresa_id = $1
                AND t.estado != 'cancelado'
                AND t.cliente_id IS NOT NULL
              GROUP BY t.cliente_id
            ) primeras
            WHERE primeras.primera_visita BETWEEN $2 AND $3
          ) AS clientes_nuevos
      `, params),
    ]);

    const tvs = parseFloat(servicios.rows[0].total_venta_servicios) || 0;
    const tvp = parseFloat(productos.rows[0].total_venta_productos) || 0;
    const turnosCobrados = parseInt(servicios.rows[0].turnos_cobrados) || 0;
    const completados = parseInt(turnos.rows[0].completados) || 0;
    const cancelados = parseInt(turnos.rows[0].cancelados) || 0;

    return {
      total_venta: tvs + tvp,
      total_venta_servicios: tvs,
      total_venta_productos: tvp,
      total_pendiente: parseFloat(pendientes.rows[0].total_pendiente) || 0,
      turnos_completados: completados,
      turnos_cancelados: cancelados,
      tasa_cancelacion: (completados + cancelados) > 0
        ? (cancelados / (completados + cancelados)) * 100
        : 0,
      ticket_promedio: turnosCobrados > 0 ? (tvs + tvp) / turnosCobrados : 0,
      cantidad_productos_vendidos: parseInt(productos.rows[0].cantidad_productos_vendidos) || 0,
      clientes_activos: parseInt(clientes.rows[0].clientes_activos) || 0,
      clientes_nuevos: parseInt(clientes.rows[0].clientes_nuevos) || 0,
    };
  }

  async getEvolucion(
    empresaId: string,
    periodo: MetricasPeriodo,
    agrupar: MetricasAgrupacion
  ): Promise<MetricasEvolucionPunto[]> {
    // Expresiones fijas por agrupación (sin interpolar input del usuario)
    const bucketTurno = agrupar === 'mes' ? "TO_CHAR(t.fecha, 'YYYY-MM')" : 't.fecha::text';
    const bucketVenta = agrupar === 'mes' ? `TO_CHAR(${FECHA_VENTA}, 'YYYY-MM')` : `${FECHA_VENTA}::text`;

    const params = [empresaId, periodo.fecha_desde, periodo.fecha_hasta];

    const result = await this.pool.query(`
      SELECT
        bucket,
        COALESCE(SUM(servicios), 0) AS servicios,
        COALESCE(SUM(productos), 0) AS productos
      FROM (
        SELECT ${bucketTurno} AS bucket, ct.servicio_monto AS servicios, 0 AS productos
        FROM comisiones_turno ct
        JOIN turnos t ON ct.turno_id = t.id
        WHERE ct.empresa_id = $1
          AND t.fecha BETWEEN $2 AND $3
          AND t.metodo_pago != 'pendiente'

        UNION ALL

        SELECT ${bucketVenta} AS bucket, 0 AS servicios, vp.precio_total AS productos
        FROM venta_productos vp
        LEFT JOIN turnos trn ON trn.id = vp.turno_id
        WHERE vp.empresa_id = $1
          AND ${FECHA_VENTA} BETWEEN $2 AND $3
          AND vp.metodo_pago != 'pendiente'
      ) sub
      GROUP BY bucket
      ORDER BY bucket
    `, params);

    return result.rows.map(r => {
      const servicios = parseFloat(r.servicios) || 0;
      const productos = parseFloat(r.productos) || 0;
      return {
        fecha: r.bucket,
        total: servicios + productos,
        servicios,
        productos,
      };
    });
  }

  async getEquipo(empresaId: string, periodo: MetricasPeriodo): Promise<MetricasEquipoItem[]> {
    const params = [empresaId, periodo.fecha_desde, periodo.fecha_hasta];

    const result = await this.pool.query(`
      SELECT
        u.id                                      AS profesional_id,
        u.nombre,
        u.username,
        u.avatar_url,
        COALESCE(s.total_venta_servicios, 0)      AS facturado_servicios,
        COALESCE(p.total_venta_productos, 0)      AS facturado_productos,
        COALESCE(s.neto_servicios, 0) + COALESCE(p.neto_productos, 0) AS neto_profesional,
        COALESCE(s.turnos_cobrados, 0)            AS turnos_cobrados,
        COALESCE(tc.completados, 0)               AS turnos_completados,
        COALESCE(tc.cancelados, 0)                AS turnos_cancelados
      FROM usuarios u
      LEFT JOIN (
        SELECT
          ct.profesional_id,
          SUM(ct.servicio_monto)            AS total_venta_servicios,
          SUM(ct.servicio_neto_profesional) AS neto_servicios,
          COUNT(*)                          AS turnos_cobrados
        FROM comisiones_turno ct
        JOIN turnos t ON ct.turno_id = t.id
        WHERE ct.empresa_id = $1
          AND t.fecha BETWEEN $2 AND $3
          AND t.metodo_pago != 'pendiente'
        GROUP BY ct.profesional_id
      ) s ON s.profesional_id = u.id
      LEFT JOIN (
        SELECT
          vp.vendedor_id,
          SUM(vp.precio_total)  AS total_venta_productos,
          SUM(vp.neto_vendedor) AS neto_productos
        FROM venta_productos vp
        LEFT JOIN turnos trn ON trn.id = vp.turno_id
        WHERE vp.empresa_id = $1
          AND ${FECHA_VENTA} BETWEEN $2 AND $3
          AND vp.metodo_pago != 'pendiente'
        GROUP BY vp.vendedor_id
      ) p ON p.vendedor_id = u.id
      LEFT JOIN (
        SELECT
          t.usuario_id,
          COUNT(*) FILTER (WHERE t.estado = 'completado') AS completados,
          COUNT(*) FILTER (WHERE t.estado = 'cancelado')  AS cancelados
        FROM turnos t
        WHERE t.empresa_id = $1 AND t.fecha BETWEEN $2 AND $3
        GROUP BY t.usuario_id
      ) tc ON tc.usuario_id = u.id
      WHERE u.empresa_id = $1 AND u.activo = true
      ORDER BY (COALESCE(s.total_venta_servicios, 0) + COALESCE(p.total_venta_productos, 0)) DESC, u.nombre ASC
    `, params);

    return result.rows.map(r => {
      const facturadoServicios = parseFloat(r.facturado_servicios) || 0;
      const facturadoProductos = parseFloat(r.facturado_productos) || 0;
      const facturado = facturadoServicios + facturadoProductos;
      const turnosCobrados = parseInt(r.turnos_cobrados) || 0;
      return {
        profesional_id: r.profesional_id,
        nombre: r.nombre,
        username: r.username,
        avatar_url: r.avatar_url ?? null,
        facturado,
        facturado_servicios: facturadoServicios,
        facturado_productos: facturadoProductos,
        neto_profesional: parseFloat(r.neto_profesional) || 0,
        turnos_completados: parseInt(r.turnos_completados) || 0,
        turnos_cancelados: parseInt(r.turnos_cancelados) || 0,
        ticket_promedio: turnosCobrados > 0 ? facturado / turnosCobrados : 0,
      };
    });
  }
}
