import { Request, Response } from 'express';
import { GetMyFinanzasUseCase } from '../../application/use-cases/finanzas/GetFinanzasUseCase';
import { GetFinanzasByProfesionalUseCase } from '../../application/use-cases/finanzas/GetFinanzasUseCase';
import { PostgresFinanzasRepository } from '../../infrastructure/repositories/PostgresFinanzasRepository';
import { PostgresVentaProductoRepository } from '../../infrastructure/repositories/PostgresVentaProductoRepository';
import { pool } from '../../infrastructure/database/postgres.connection';
import { FinanzasFilters } from '../../domain/entities/Finanzas';

// Dependencies
const finanzasRepository = new PostgresFinanzasRepository(pool);
const getMyFinanzasUseCase = new GetMyFinanzasUseCase(finanzasRepository);
const getFinanzasByProfesionalUseCase = new GetFinanzasByProfesionalUseCase(finanzasRepository);
const cobrarPagoRepo = finanzasRepository;
const ventaProductoRepo = new PostgresVentaProductoRepository();

export class FinanzasController {
  async getMyFinanzas(req: Request, res: Response): Promise<Response | void> {
    try {
      // Obtener datos del usuario autenticado desde el token
      const authUser = (req as any).user;
      
      if (!authUser) {
        return res.status(401).json({ message: 'Usuario no autenticado' });
      }

      // Extraer y validar query params
      const filters: FinanzasFilters = {
        fecha_desde: req.query.fecha_desde as string || '',
        fecha_hasta: req.query.fecha_hasta as string || '',
        metodo_pago: ((req.query.metodo_pago as string) || 'todos') as FinanzasFilters['metodo_pago'],
        estado_comision: ((req.query.estado_comision as string) || 'todos') as FinanzasFilters['estado_comision'],
        ordenar_por: ((req.query.ordenar_por as string) || 'fecha') as FinanzasFilters['ordenar_por'],
        orden: ((req.query.orden as string) || 'desc') as FinanzasFilters['orden'],
        pagina: parseInt(req.query.pagina as string) || 1,
        por_pagina: parseInt(req.query.por_pagina as string) || 20
      };

      // Validar filtros
      if (!filters.fecha_desde || !filters.fecha_hasta) {
        return res.status(400).json({ 
          message: 'Las fechas desde y hasta son obligatorias' 
        });
      }

      // Validar valores de filtros
      const validMetodosPago = ['todos', 'efectivo', 'transferencia', 'pendiente'];
      const validEstados = ['todos', 'pendiente', 'pagada', 'cancelada'];
      const validOrdenarPor = ['fecha', 'total_venta', 'total_neto_profesional'];
      const validOrden = ['asc', 'desc'];

      if (!validMetodosPago.includes(filters.metodo_pago)) {
        return res.status(400).json({ message: 'Método de pago inválido' });
      }

      if (!validEstados.includes(filters.estado_comision)) {
        return res.status(400).json({ message: 'Estado de comisión inválido' });
      }

      if (!validOrdenarPor.includes(filters.ordenar_por)) {
        return res.status(400).json({ message: 'Campo de ordenamiento inválido' });
      }

      if (!validOrden.includes(filters.orden)) {
        return res.status(400).json({ message: 'Orden inválido' });
      }

      if (filters.pagina < 1 || filters.por_pagina < 1 || filters.por_pagina > 100) {
        return res.status(400).json({ message: 'Parámetros de paginación inválidos' });
      }

      // Ejecutar use case
      const result = await getMyFinanzasUseCase.execute(
        authUser.id,
        authUser.empresaId,
        filters
      );

      res.json(result);
    } catch (error) {
      console.error('Error en getMyFinanzas:', error);
      res.status(500).json({ 
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  async getFinanzasByProfesional(req: Request, res: Response): Promise<Response | void> {
    try {
      // Verificar que sea admin
      const authUser = (req as any).user;
      
      if (!authUser || !authUser.roles || !Array.isArray(authUser.roles) || !authUser.roles.includes('admin')) {
        return res.status(403).json({ 
          message: 'Acceso denegado. Se requiere rol de administrador' 
        });
      }

      const profesionalId = req.params.id as string;
      
      if (!profesionalId || typeof profesionalId !== 'string') {
        return res.status(400).json({ message: 'ID de profesional es requerido y debe ser válido' });
      }

      // Extraer y validar query params (similar al método anterior)
      const filters: FinanzasFilters = {
        fecha_desde: req.query.fecha_desde as string || '',
        fecha_hasta: req.query.fecha_hasta as string || '',
        metodo_pago: ((req.query.metodo_pago as string) || 'todos') as FinanzasFilters['metodo_pago'],
        estado_comision: ((req.query.estado_comision as string) || 'todos') as FinanzasFilters['estado_comision'],
        ordenar_por: ((req.query.ordenar_por as string) || 'fecha') as FinanzasFilters['ordenar_por'],
        orden: ((req.query.orden as string) || 'desc') as FinanzasFilters['orden'],
        pagina: parseInt(req.query.pagina as string) || 1,
        por_pagina: parseInt(req.query.por_pagina as string) || 20
      };

      // Validaciones (mismas que el método anterior)
      if (!filters.fecha_desde || !filters.fecha_hasta) {
        return res.status(400).json({ 
          message: 'Las fechas desde y hasta son obligatorias' 
        });
      }

      const validMetodosPago = ['todos', 'efectivo', 'transferencia', 'pendiente'];
      const validEstados = ['todos', 'pendiente', 'pagada', 'cancelada'];
      const validOrdenarPor = ['fecha', 'total_venta', 'total_neto_profesional'];
      const validOrden = ['asc', 'desc'];

      if (!validMetodosPago.includes(filters.metodo_pago) ||
          !validEstados.includes(filters.estado_comision) ||
          !validOrdenarPor.includes(filters.ordenar_por) ||
          !validOrden.includes(filters.orden) ||
          filters.pagina < 1 || filters.por_pagina < 1 || filters.por_pagina > 100) {
        return res.status(400).json({ message: 'Parámetros inválidos' });
      }

      // Ejecutar use case
      const result = await getFinanzasByProfesionalUseCase.execute(
        profesionalId,
        authUser.empresaId,
        filters
      );

      res.json(result);
    } catch (error) {
      console.error('Error en getFinanzasByProfesional:', error);
      res.status(500).json({
        message: 'Error interno del servidor',
        error: error instanceof Error ? error.message : 'Error desconocido'
      });
    }
  }

  async getProductosTurno(req: Request, res: Response): Promise<Response | void> {
    try {
      const authUser = (req as any).user;
      if (!authUser) return res.status(401).json({ message: 'No autenticado' });
      const turnoId = req.params.turnoId as string;
      const productos = await ventaProductoRepo.findByTurnoWithPrices(turnoId, authUser.empresaId);
      res.json({ success: true, data: productos });
    } catch (error) {
      res.status(500).json({ message: 'Error al obtener productos del turno' });
    }
  }

  async cobrarPago(req: Request, res: Response): Promise<Response | void> {
    try {
      const authUser = (req as any).user;
      if (!authUser) return res.status(401).json({ message: 'No autenticado' });

      const { tipo, id, metodo_pago, metodo_pago_productos } = req.body;

      if (!tipo || !id || !metodo_pago) {
        return res.status(400).json({ message: 'tipo, id y metodo_pago son requeridos' });
      }
      if (!['turno', 'turno_solo_servicio', 'venta_turno', 'venta'].includes(tipo)) {
        return res.status(400).json({ message: 'tipo debe ser "turno", "turno_solo_servicio", "venta_turno" o "venta"' });
      }
      if (!['efectivo', 'transferencia'].includes(metodo_pago)) {
        return res.status(400).json({ message: 'metodo_pago debe ser "efectivo" o "transferencia"' });
      }
      if (metodo_pago_productos && !['efectivo', 'transferencia'].includes(metodo_pago_productos)) {
        return res.status(400).json({ message: 'metodo_pago_productos debe ser "efectivo" o "transferencia"' });
      }

      await cobrarPagoRepo.cobrarPago(tipo, id, authUser.empresaId, metodo_pago, metodo_pago_productos);
      res.json({ success: true });
    } catch (error) {
      console.error('Error en cobrarPago:', error);
      res.status(500).json({ message: 'Error al registrar el cobro' });
    }
  }
}
