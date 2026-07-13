import { Request, Response } from 'express';
import {
  GetMetricasResumenUseCase,
  GetMetricasEvolucionUseCase,
  GetMetricasEquipoUseCase,
} from '../../application/use-cases/metricas/GetMetricasUseCase';
import { PostgresMetricasRepository } from '../../infrastructure/repositories/PostgresMetricasRepository';
import { pool } from '../../infrastructure/database/postgres.connection';
import { MetricasPeriodo, MetricasAgrupacion } from '../../domain/entities/Metricas';

// Dependencies
const metricasRepository = new PostgresMetricasRepository(pool);
const getResumenUseCase = new GetMetricasResumenUseCase(metricasRepository);
const getEvolucionUseCase = new GetMetricasEvolucionUseCase(metricasRepository);
const getEquipoUseCase = new GetMetricasEquipoUseCase(metricasRepository);

const FECHA_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Valida y extrae el período de los query params; devuelve null si es inválido
function extraerPeriodo(req: Request, res: Response): MetricasPeriodo | null {
  const fecha_desde = (req.query.fecha_desde as string) || '';
  const fecha_hasta = (req.query.fecha_hasta as string) || '';

  if (!fecha_desde || !fecha_hasta) {
    res.status(400).json({ message: 'Las fechas desde y hasta son obligatorias' });
    return null;
  }
  if (!FECHA_REGEX.test(fecha_desde) || !FECHA_REGEX.test(fecha_hasta)) {
    res.status(400).json({ message: 'Formato de fecha inválido (se espera YYYY-MM-DD)' });
    return null;
  }
  if (fecha_desde > fecha_hasta) {
    res.status(400).json({ message: 'fecha_desde no puede ser posterior a fecha_hasta' });
    return null;
  }
  return { fecha_desde, fecha_hasta };
}

export class MetricasController {
  async getResumen(req: Request, res: Response): Promise<Response | void> {
    try {
      const authUser = req.user!;
      const periodo = extraerPeriodo(req, res);
      if (!periodo) return;

      const resumen = await getResumenUseCase.execute(authUser.empresaId, periodo);
      res.json({ success: true, data: resumen });
    } catch (error) {
      console.error('Error en getResumen de métricas:', error);
      res.status(500).json({
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }

  async getEvolucion(req: Request, res: Response): Promise<Response | void> {
    try {
      const authUser = req.user!;
      const periodo = extraerPeriodo(req, res);
      if (!periodo) return;

      const agrupar = ((req.query.agrupar as string) || 'dia') as MetricasAgrupacion;
      if (!['dia', 'mes'].includes(agrupar)) {
        return res.status(400).json({ message: 'agrupar debe ser "dia" o "mes"' });
      }

      const evolucion = await getEvolucionUseCase.execute(authUser.empresaId, periodo, agrupar);
      res.json({ success: true, data: evolucion });
    } catch (error) {
      console.error('Error en getEvolucion de métricas:', error);
      res.status(500).json({
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }

  async getEquipo(req: Request, res: Response): Promise<Response | void> {
    try {
      const authUser = req.user!;
      const periodo = extraerPeriodo(req, res);
      if (!periodo) return;

      const equipo = await getEquipoUseCase.execute(authUser.empresaId, periodo);
      res.json({ success: true, data: equipo });
    } catch (error) {
      console.error('Error en getEquipo de métricas:', error);
      res.status(500).json({
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido',
      });
    }
  }
}
