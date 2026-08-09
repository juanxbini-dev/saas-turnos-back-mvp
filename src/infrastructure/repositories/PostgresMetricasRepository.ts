import { Pool } from 'pg';
import {
  MetricasPeriodo,
  MetricasResumen,
  MetricasAgrupacion,
  MetricasEvolucionPunto,
  MetricasEquipoItem,
  MetricasClientesNuevos,
  MetricasClienteNuevoItem,
  MetricasClientesNuevosPorProfesional,
  MetricasComparativaItem,
  MetricasServicioDesglose,
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

  async getClientesNuevos(
    empresaId: string,
    periodo: MetricasPeriodo
  ): Promise<MetricasClientesNuevos> {
    const params = [empresaId, periodo.fecha_desde, periodo.fecha_hasta];

    // Primer turno histórico (no cancelado) de cada cliente; si cae dentro del
    // período, el cliente es "nuevo" y se atribuye al profesional de ese turno.
    const result = await this.pool.query(`
      WITH primeras AS (
        SELECT DISTINCT ON (t.cliente_id)
          t.cliente_id, t.fecha, t.hora, t.usuario_id, t.servicio, t.origen
        FROM turnos t
        WHERE t.empresa_id = $1
          AND t.estado != 'cancelado'
          AND t.cliente_id IS NOT NULL
        ORDER BY t.cliente_id, t.fecha ASC, t.hora ASC, t.created_at ASC
      )
      SELECT
        p.cliente_id,
        c.nombre      AS cliente_nombre,
        c.telefono,
        p.fecha::text AS fecha_primera_visita,
        p.servicio,
        p.origen,
        p.usuario_id  AS profesional_id,
        u.nombre      AS profesional_nombre,
        u.avatar_url,
        EXISTS (
          SELECT 1
          FROM turnos t2
          WHERE t2.empresa_id = $1
            AND t2.cliente_id = p.cliente_id
            AND t2.estado != 'cancelado'
            AND (t2.fecha > p.fecha OR (t2.fecha = p.fecha AND t2.hora > p.hora))
        ) AS volvio
      FROM primeras p
      JOIN clientes c ON c.id = p.cliente_id
      LEFT JOIN usuarios u ON u.id = p.usuario_id
      WHERE p.fecha BETWEEN $2 AND $3
      ORDER BY p.fecha DESC, p.hora DESC
    `, params);

    const clientes: MetricasClienteNuevoItem[] = result.rows.map(r => ({
      cliente_id: r.cliente_id,
      cliente_nombre: r.cliente_nombre,
      telefono: r.telefono ?? null,
      fecha_primera_visita: r.fecha_primera_visita,
      profesional_id: r.profesional_id ?? null,
      profesional_nombre: r.profesional_nombre ?? null,
      servicio: r.servicio,
      origen: r.origen ?? null,
      volvio: r.volvio === true,
    }));

    const porProfesionalMap = new Map<string, MetricasClientesNuevosPorProfesional>();
    for (const row of result.rows) {
      if (!row.profesional_id) continue;
      const existente = porProfesionalMap.get(row.profesional_id);
      if (existente) {
        existente.clientes_nuevos += 1;
      } else {
        porProfesionalMap.set(row.profesional_id, {
          profesional_id: row.profesional_id,
          nombre: row.profesional_nombre,
          avatar_url: row.avatar_url ?? null,
          clientes_nuevos: 1,
        });
      }
    }

    return {
      total: clientes.length,
      por_profesional: [...porProfesionalMap.values()]
        .sort((a, b) => b.clientes_nuevos - a.clientes_nuevos || a.nombre.localeCompare(b.nombre)),
      clientes,
    };
  }

  async getComparativa(
    empresaId: string,
    periodo: MetricasPeriodo,
    agrupar: MetricasAgrupacion
  ): Promise<MetricasComparativaItem[]> {
    const params = [empresaId, periodo.fecha_desde, periodo.fecha_hasta];
    const bucketTurno = agrupar === 'mes' ? "TO_CHAR(t.fecha, 'YYYY-MM')" : 't.fecha::text';
    const bucketVenta = agrupar === 'mes' ? `TO_CHAR(${FECHA_VENTA}, 'YYYY-MM')` : `${FECHA_VENTA}::text`;

    const [
      usuarios,
      servicios,
      productos,
      pendientes,
      estados,
      clientes,
      nuevos,
      desglose,
      evolucion,
    ] = await Promise.all([
      this.pool.query(`
        SELECT id, nombre, username, avatar_url
        FROM usuarios
        WHERE empresa_id = $1 AND activo = true
        ORDER BY nombre ASC
      `, [empresaId]),

      // Facturación por servicios cobrados
      this.pool.query(`
        SELECT
          ct.profesional_id,
          SUM(ct.servicio_monto)             AS facturado_servicios,
          SUM(ct.servicio_neto_profesional)  AS neto_servicios,
          SUM(ct.servicio_comision_monto)    AS comision_servicios,
          COUNT(*)                           AS turnos_cobrados
        FROM comisiones_turno ct
        JOIN turnos t ON ct.turno_id = t.id
        WHERE ct.empresa_id = $1
          AND t.fecha BETWEEN $2 AND $3
          AND t.metodo_pago != 'pendiente'
        GROUP BY ct.profesional_id
      `, params),

      // Facturación por productos cobrados
      this.pool.query(`
        SELECT
          vp.vendedor_id,
          SUM(vp.precio_total)                    AS facturado_productos,
          SUM(vp.neto_vendedor)                   AS neto_productos,
          SUM(vp.precio_total - vp.neto_vendedor) AS comision_productos,
          SUM(vp.cantidad)                        AS unidades
        FROM venta_productos vp
        LEFT JOIN turnos trn ON trn.id = vp.turno_id
        WHERE vp.empresa_id = $1
          AND ${FECHA_VENTA} BETWEEN $2 AND $3
          AND vp.metodo_pago != 'pendiente'
        GROUP BY vp.vendedor_id
      `, params),

      // Pendiente de cobro (servicios + productos) por profesional
      this.pool.query(`
        SELECT profesional_id, SUM(pendiente) AS pendiente_cobro
        FROM (
          SELECT ct.profesional_id, COALESCE(t.total_final, 0) AS pendiente
          FROM comisiones_turno ct
          JOIN turnos t ON ct.turno_id = t.id
          WHERE ct.empresa_id = $1
            AND t.fecha BETWEEN $2 AND $3
            AND t.metodo_pago = 'pendiente'

          UNION ALL

          SELECT vp.vendedor_id AS profesional_id, vp.precio_total AS pendiente
          FROM venta_productos vp
          LEFT JOIN turnos trn ON trn.id = vp.turno_id
          WHERE vp.empresa_id = $1
            AND ${FECHA_VENTA} BETWEEN $2 AND $3
            AND vp.metodo_pago = 'pendiente'
        ) sub
        GROUP BY profesional_id
      `, params),

      // Turnos por estado y minutos trabajados
      this.pool.query(`
        SELECT
          t.usuario_id,
          COUNT(*) FILTER (WHERE t.estado = 'completado')          AS completados,
          COUNT(*) FILTER (WHERE t.estado = 'cancelado')           AS cancelados,
          COALESCE(SUM(t.duracion) FILTER (WHERE t.estado = 'completado'), 0) AS minutos_trabajados
        FROM turnos t
        WHERE t.empresa_id = $1 AND t.fecha BETWEEN $2 AND $3
        GROUP BY t.usuario_id
      `, params),

      // Clientes atendidos en el período y cuántos ya eran clientes de antes
      this.pool.query(`
        WITH primeras AS (
          SELECT t.cliente_id, MIN(t.fecha) AS primera_visita
          FROM turnos t
          WHERE t.empresa_id = $1
            AND t.estado != 'cancelado'
            AND t.cliente_id IS NOT NULL
          GROUP BY t.cliente_id
        )
        SELECT
          t.usuario_id,
          COUNT(DISTINCT t.cliente_id) AS clientes_atendidos,
          COUNT(DISTINCT t.cliente_id) FILTER (WHERE p.primera_visita < $2) AS clientes_recurrentes
        FROM turnos t
        JOIN primeras p ON p.cliente_id = t.cliente_id
        WHERE t.empresa_id = $1
          AND t.fecha BETWEEN $2 AND $3
          AND t.estado = 'completado'
        GROUP BY t.usuario_id
      `, params),

      // Clientes nuevos captados: primer turno histórico dentro del período
      this.pool.query(`
        WITH primeros AS (
          SELECT DISTINCT ON (t.cliente_id) t.cliente_id, t.fecha, t.usuario_id
          FROM turnos t
          WHERE t.empresa_id = $1
            AND t.estado != 'cancelado'
            AND t.cliente_id IS NOT NULL
          ORDER BY t.cliente_id, t.fecha ASC, t.hora ASC, t.created_at ASC
        )
        SELECT usuario_id, COUNT(*) AS clientes_nuevos
        FROM primeros
        WHERE fecha BETWEEN $2 AND $3
        GROUP BY usuario_id
      `, params),

      // Desglose de facturación por servicio (cobrados)
      this.pool.query(`
        SELECT
          ct.profesional_id,
          t.servicio,
          COUNT(*)               AS cantidad,
          SUM(ct.servicio_monto) AS facturado
        FROM comisiones_turno ct
        JOIN turnos t ON ct.turno_id = t.id
        WHERE ct.empresa_id = $1
          AND t.fecha BETWEEN $2 AND $3
          AND t.metodo_pago != 'pendiente'
        GROUP BY ct.profesional_id, t.servicio
        ORDER BY SUM(ct.servicio_monto) DESC
      `, params),

      // Evolución de facturación cobrada por profesional
      this.pool.query(`
        SELECT
          profesional_id,
          bucket,
          COALESCE(SUM(servicios), 0) AS servicios,
          COALESCE(SUM(productos), 0) AS productos
        FROM (
          SELECT ct.profesional_id, ${bucketTurno} AS bucket,
                 ct.servicio_monto AS servicios, 0 AS productos
          FROM comisiones_turno ct
          JOIN turnos t ON ct.turno_id = t.id
          WHERE ct.empresa_id = $1
            AND t.fecha BETWEEN $2 AND $3
            AND t.metodo_pago != 'pendiente'

          UNION ALL

          SELECT vp.vendedor_id AS profesional_id, ${bucketVenta} AS bucket,
                 0 AS servicios, vp.precio_total AS productos
          FROM venta_productos vp
          LEFT JOIN turnos trn ON trn.id = vp.turno_id
          WHERE vp.empresa_id = $1
            AND ${FECHA_VENTA} BETWEEN $2 AND $3
            AND vp.metodo_pago != 'pendiente'
        ) sub
        GROUP BY profesional_id, bucket
        ORDER BY bucket
      `, params),
    ]);

    const porProfesional = <T>(rows: any[], key: string): Map<string, T> => {
      const map = new Map<string, T>();
      for (const row of rows) {
        if (row[key]) map.set(row[key], row);
      }
      return map;
    };

    const serviciosMap = porProfesional<any>(servicios.rows, 'profesional_id');
    const productosMap = porProfesional<any>(productos.rows, 'vendedor_id');
    const pendientesMap = porProfesional<any>(pendientes.rows, 'profesional_id');
    const estadosMap = porProfesional<any>(estados.rows, 'usuario_id');
    const clientesMap = porProfesional<any>(clientes.rows, 'usuario_id');
    const nuevosMap = porProfesional<any>(nuevos.rows, 'usuario_id');

    const desgloseMap = new Map<string, MetricasServicioDesglose[]>();
    for (const row of desglose.rows) {
      const lista = desgloseMap.get(row.profesional_id) ?? [];
      lista.push({
        servicio: row.servicio,
        cantidad: parseInt(row.cantidad) || 0,
        facturado: parseFloat(row.facturado) || 0,
      });
      desgloseMap.set(row.profesional_id, lista);
    }

    const evolucionMap = new Map<string, MetricasEvolucionPunto[]>();
    for (const row of evolucion.rows) {
      const lista = evolucionMap.get(row.profesional_id) ?? [];
      const serviciosMonto = parseFloat(row.servicios) || 0;
      const productosMonto = parseFloat(row.productos) || 0;
      lista.push({
        fecha: row.bucket,
        total: serviciosMonto + productosMonto,
        servicios: serviciosMonto,
        productos: productosMonto,
      });
      evolucionMap.set(row.profesional_id, lista);
    }

    return usuarios.rows
      .map((u): MetricasComparativaItem => {
        const s = serviciosMap.get(u.id);
        const p = productosMap.get(u.id);
        const est = estadosMap.get(u.id);
        const cli = clientesMap.get(u.id);

        const facturadoServicios = parseFloat(s?.facturado_servicios) || 0;
        const facturadoProductos = parseFloat(p?.facturado_productos) || 0;
        const facturado = facturadoServicios + facturadoProductos;
        const turnosCobrados = parseInt(s?.turnos_cobrados) || 0;
        const completados = parseInt(est?.completados) || 0;
        const cancelados = parseInt(est?.cancelados) || 0;
        const minutos = parseInt(est?.minutos_trabajados) || 0;
        const horas = minutos / 60;
        const atendidos = parseInt(cli?.clientes_atendidos) || 0;
        const recurrentes = parseInt(cli?.clientes_recurrentes) || 0;

        return {
          profesional_id: u.id,
          nombre: u.nombre,
          username: u.username,
          avatar_url: u.avatar_url ?? null,
          facturado,
          facturado_servicios: facturadoServicios,
          facturado_productos: facturadoProductos,
          neto_profesional: (parseFloat(s?.neto_servicios) || 0) + (parseFloat(p?.neto_productos) || 0),
          comision_empresa: (parseFloat(s?.comision_servicios) || 0) + (parseFloat(p?.comision_productos) || 0),
          pendiente_cobro: parseFloat(pendientesMap.get(u.id)?.pendiente_cobro) || 0,
          turnos_completados: completados,
          turnos_cancelados: cancelados,
          tasa_cancelacion: (completados + cancelados) > 0
            ? (cancelados / (completados + cancelados)) * 100
            : 0,
          ticket_promedio: turnosCobrados > 0 ? facturado / turnosCobrados : 0,
          productos_vendidos: parseInt(p?.unidades) || 0,
          clientes_atendidos: atendidos,
          clientes_nuevos: parseInt(nuevosMap.get(u.id)?.clientes_nuevos) || 0,
          clientes_recurrentes: recurrentes,
          tasa_recurrencia: atendidos > 0 ? (recurrentes / atendidos) * 100 : 0,
          horas_trabajadas: horas,
          facturacion_por_hora: horas > 0 ? facturado / horas : 0,
          servicios: desgloseMap.get(u.id) ?? [],
          evolucion: evolucionMap.get(u.id) ?? [],
        };
      })
      .sort((a, b) => b.facturado - a.facturado || a.nombre.localeCompare(b.nombre));
  }
}
