import { Pool } from 'pg';
import { ComisionProfesional, FinanzasFilters, FinanzasSummary, ComisionConDetalle } from '../../domain/entities/Finanzas';
import { IFinanzasRepository } from '../../domain/repositories/IFinanzasRepository';

export class PostgresFinanzasRepository implements IFinanzasRepository {
  constructor(private pool: Pool) {}

  async getComisionesByProfesional(
    profesionalId: string,
    empresaId: string,
    filters: FinanzasFilters
  ): Promise<{ data: ComisionConDetalle[]; total: number }> {
    
    // Construir WHERE dinámico
    const whereConditions = [
      'cp.profesional_id = $1',
      'cp.empresa_id = $2',
      't.fecha BETWEEN $3 AND $4'
    ];

    const params: any[] = [profesionalId, empresaId, filters.fecha_desde, filters.fecha_hasta];
    let paramIndex = 5;

    // Filtro por método de pago
    if (filters.metodo_pago !== 'todos') {
      whereConditions.push(`t.metodo_pago = $${paramIndex}`);
      params.push(filters.metodo_pago);
      paramIndex++;
    }

    // Filtro por estado de comisión
    if (filters.estado_comision !== 'todos') {
      whereConditions.push(`cp.estado = $${paramIndex}`);
      params.push(filters.estado_comision);
      paramIndex++;
    }

    // Construcción de ORDER BY
    const orderByMap = {
      fecha: 't.fecha',
      total_venta: 'cp.total_venta',
      total_neto_profesional: 'cp.total_neto_profesional'
    };
    
    const orderField = orderByMap[filters.ordenar_por] || 't.fecha';
    const orderDirection = filters.orden.toUpperCase();
    
    // Query principal con paginación
    const query = `
      SELECT 
        cp.*,
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
      FROM comisiones_profesionales cp
      JOIN turnos t ON cp.turno_id = t.id
      JOIN clientes c ON t.cliente_id = c.id
      LEFT JOIN servicios s ON t.servicio_id = s.id
      LEFT JOIN usuarios u ON cp.profesional_id = u.id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY ${orderField} ${orderDirection}, t.hora ${orderDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(filters.por_pagina, (filters.pagina - 1) * filters.por_pagina);

    // Query para contar total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM comisiones_profesionales cp
      JOIN turnos t ON cp.turno_id = t.id
      WHERE ${whereConditions.join(' AND ')}
    `;

    const countParams = params.slice(0, -2); // Excluir LIMIT y OFFSET

    try {
      // Ejecutar query principal
      const result = await this.pool.query(query, params);
      
      // Ejecutar query de conteo
      const countResult = await this.pool.query(countQuery, countParams);
      const total = parseInt(countResult.rows[0].total);

      return {
        data: result.rows as ComisionConDetalle[],
        total
      };
    } catch (error) {
      console.error('Error en getComisionesByProfesional:', error);
      throw error;
    }
  }

  async getFinanzasSummary(
    profesionalId: string,
    empresaId: string,
    filters: FinanzasFilters
  ): Promise<FinanzasSummary> {
    
    // Construir WHERE dinámico (similar al método anterior)
    const whereConditions = [
      'cp.profesional_id = $1',
      'cp.empresa_id = $2',
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
      whereConditions.push(`cp.estado = $${paramIndex}`);
      params.push(filters.estado_comision);
      paramIndex++;
    }

    const query = `
      SELECT 
        COALESCE(SUM(cp.total_venta), 0) as total_venta,
        COALESCE(SUM(cp.total_comision_empresa), 0) as total_comision_empresa,
        COALESCE(SUM(cp.total_neto_profesional), 0) as total_neto_profesional,
        COALESCE(SUM(t.descuento_monto), 0) as total_descuentos,
        COUNT(*) as cantidad_turnos,
        CASE 
          WHEN COUNT(*) > 0 THEN COALESCE(SUM(cp.total_venta), 0) / COUNT(*)
          ELSE 0 
        END as promedio_por_turno
      FROM comisiones_profesionales cp
      JOIN turnos t ON cp.turno_id = t.id
      WHERE ${whereConditions.join(' AND ')}
    `;

    try {
      const result = await this.pool.query(query, params);
      
      if (result.rows.length === 0) {
        return {
          total_venta: 0,
          total_comision_empresa: 0,
          total_neto_profesional: 0,
          total_descuentos: 0,
          cantidad_turnos: 0,
          promedio_por_turno: 0
        };
      }

      const row = result.rows[0];
      return {
        total_venta: parseFloat(row.total_venta) || 0,
        total_comision_empresa: parseFloat(row.total_comision_empresa) || 0,
        total_neto_profesional: parseFloat(row.total_neto_profesional) || 0,
        total_descuentos: parseFloat(row.total_descuentos) || 0,
        cantidad_turnos: parseInt(row.cantidad_turnos) || 0,
        promedio_por_turno: parseFloat(row.promedio_por_turno) || 0
      };
    } catch (error) {
      console.error('Error en getFinanzasSummary:', error);
      throw error;
    }
  }
}
