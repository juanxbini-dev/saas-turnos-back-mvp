import { Request, Response } from 'express';
import { GetTurnosUseCase } from '../../application/use-cases/turnos/GetTurnosUseCase';
import { CreateTurnoUseCase } from '../../application/use-cases/turnos/CreateTurnoUseCase';
import { UpdateTurnoEstadoUseCase } from '../../application/use-cases/turnos/UpdateTurnoEstadoUseCase';
import { GetDisponibilidadMesUseCase } from '../../application/use-cases/turnos/GetDisponibilidadMesUseCase';
import { GetSlotsDisponiblesUseCase } from '../../application/use-cases/turnos/GetSlotsDisponiblesUseCase';
import { GetCalendarioUseCase } from '../../application/use-cases/turnos/GetCalendarioUseCase';
import { CreateDisponibilidadUseCase } from '../../application/use-cases/disponibilidad/CreateDisponibilidadUseCase';
import { UpdateDisponibilidadUseCase } from '../../application/use-cases/disponibilidad/UpdateDisponibilidadUseCase';
import { DeleteDisponibilidadUseCase } from '../../application/use-cases/disponibilidad/DeleteDisponibilidadUseCase';
import { CreateVacacionUseCase } from '../../application/use-cases/disponibilidad/CreateVacacionUseCase';
import { UpdateVacacionUseCase } from '../../application/use-cases/disponibilidad/UpdateVacacionUseCase';
import { DeleteVacacionUseCase } from '../../application/use-cases/disponibilidad/DeleteVacacionUseCase';
import { CreateExcepcionUseCase } from '../../application/use-cases/disponibilidad/CreateExcepcionUseCase';
import { UpdateExcepcionUseCase } from '../../application/use-cases/disponibilidad/UpdateExcepcionUseCase';
import { DeleteExcepcionUseCase } from '../../application/use-cases/disponibilidad/DeleteExcepcionUseCase';
import { GetSlotsRangoUseCase } from '../../application/use-cases/turnos/GetSlotsRangoUseCase';
import { IDisponibilidadRepository } from '../../domain/repositories/IDisponibilidadRepository';
import { DateUtils } from '../../shared/utils/DateUtils';
import { isFeatureEnabled, logDate } from '../../shared/config/featureFlags';

export class TurnosController {
  constructor(
    private getTurnosUseCase: GetTurnosUseCase,
    private createTurnoUseCase: CreateTurnoUseCase,
    private updateTurnoEstadoUseCase: UpdateTurnoEstadoUseCase,
    private getDisponibilidadMesUseCase: GetDisponibilidadMesUseCase,
    private getSlotsDisponiblesUseCase: GetSlotsDisponiblesUseCase,
    private getCalendarioUseCase: GetCalendarioUseCase,
    private createDisponibilidadUseCase: CreateDisponibilidadUseCase,
    private updateDisponibilidadUseCase: UpdateDisponibilidadUseCase,
    private deleteDisponibilidadUseCase: DeleteDisponibilidadUseCase,
    private createVacacionUseCase: CreateVacacionUseCase,
    private updateVacacionUseCase: UpdateVacacionUseCase,
    private deleteVacacionUseCase: DeleteVacacionUseCase,
    private createExcepcionUseCase: CreateExcepcionUseCase,
    private updateExcepcionUseCase: UpdateExcepcionUseCase,
    private deleteExcepcionUseCase: DeleteExcepcionUseCase,
    private getSlotsRangoUseCase: GetSlotsRangoUseCase,
    private disponibilidadRepository: IDisponibilidadRepository
  ) {}

  async getTurnos(req: Request, res: Response) {
    try {
      const { empresaId, id: usuarioId, roles } = req.user!;
      const isAdmin = roles.includes('admin');
      
      const turnos = await this.getTurnosUseCase.execute(empresaId, usuarioId, isAdmin);
      
      res.json({ success: true, data: turnos });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error al obtener turnos' 
      });
    }
  }

  async createTurno(req: Request, res: Response) {
    try {
      const { empresaId, id: usuarioId, roles } = req.user!;
      const isAdmin = roles.includes('admin');
      
      const turno = await this.createTurnoUseCase.execute(req.body, usuarioId, isAdmin);
      
      res.status(201).json({ success: true, data: turno });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error al crear turno' 
      });
    }
  }

  async updateEstado(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { estado } = req.body;
      
      const turno = await this.updateTurnoEstadoUseCase.execute(id, estado);
      
      res.json({ success: true, data: turno });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error al actualizar estado del turno' 
      });
    }
  }

  async getDisponibilidadMes(req: Request, res: Response) {
    try {
      const { profesionalId } = req.params;
      const { mes, año } = req.query;
      
      console.log('🔍 [TurnosController] getDisponibilidadMes - Petición recibida:', { profesionalId, mes, año });
      
      const diasDisponibles = await this.getDisponibilidadMesUseCase.execute(
        profesionalId,
        Number(mes),
        Number(año)
      );
      
      console.log('🔍 [TurnosController] getDisponibilidadMes - Resultado:', diasDisponibles);
      
      res.json({ success: true, data: diasDisponibles });
    } catch (error: any) {
      console.error('💥 [TurnosController] Error en getDisponibilidadMes:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error al obtener disponibilidad del mes' 
      });
    }
  }

  async getSlotsDisponibles(req: Request, res: Response) {
    try {
      const { profesionalId } = req.params;
      const { fecha } = req.query;
      
      console.log('🔍 [TurnosController] getSlotsDisponibles - Petición:', { profesionalId, fecha });
      
      // Validar que fecha exista
      if (!fecha || typeof fecha !== 'string') {
        return res.status(400).json({ 
          success: false, 
          message: 'El parámetro fecha es requerido y debe ser un string' 
        });
      }
      
      // Si no hay usuario autenticado (ruta debug), creamos un usuario mock
      if (!req.user) {
        console.log('🔍 [TurnosController] Modo debug - sin autenticación');
      }
      
      const slots = await this.getSlotsDisponiblesUseCase.execute(
        profesionalId,
        fecha
      );
      
      console.log('🔍 [TurnosController] getSlotsDisponibles - Resultado:', slots);
      
      res.json({ success: true, data: slots });
    } catch (error: any) {
      console.error('💥 [TurnosController] Error en getSlotsDisponibles:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error al obtener slots disponibles' 
      });
    }
  }

  async getSlotsRango(req: Request, res: Response) {
    try {
      const { profesionalId } = req.params;
      const { fechaInicio, fechaFin } = req.query;
      
      logDate('getSlotsRango - Petición:', { profesionalId, fechaInicio, fechaFin });
      
      // Usar DateUtils si el feature flag está activo
      const useNewUtils = isFeatureEnabled('USE_DATE_UTILS_IN_TURNS');
      
      // Validar parámetros requeridos
      if (!profesionalId) {
        return res.status(400).json({
          success: false,
          message: 'El ID del profesional es requerido'
        });
      }
      
      if (!fechaInicio || !fechaFin || typeof fechaInicio !== 'string' || typeof fechaFin !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'Las fechas de inicio y fin son requeridas'
        });
      }
      
      // Validar formato de fechas
      const inicio = useNewUtils ? (() => {
        if (!DateUtils.isValidDate(fechaInicio)) {
          return null;
        }
        return new Date(fechaInicio);
      })() : new Date(fechaInicio);
      
      const fin = useNewUtils ? (() => {
        if (!DateUtils.isValidDate(fechaFin)) {
          return null;
        }
        return new Date(fechaFin);
      })() : new Date(fechaFin);
      
      if (!inicio || !fin || (useNewUtils ? false : (isNaN(inicio.getTime()) || isNaN(fin.getTime())))) {
        return res.status(400).json({
          success: false,
          message: 'Formato de fechas inválido'
        });
      }
      
      // Limitar rango a máximo 30 días para evitar sobrecarga
      const diasDiferencia = useNewUtils ? DateUtils.daysDifference(inicio, fin) : Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
      
      if (diasDiferencia > 30) {
        return res.status(400).json({
          success: false,
          message: 'El rango máximo permitido es de 30 días'
        });
      }
      
      logDate('Validaciones OK - Procesando rango de', { diasDiferencia, useNewUtils });
      
      const slotsRango = await this.getSlotsRangoUseCase.execute(
        profesionalId as string,
        fechaInicio,
        fechaFin
      );
      
      logDate('getSlotsRango - Resultado:', slotsRango);
      
      res.json({ success: true, data: slotsRango });
    } catch (error: any) {
      console.error('💥 [TurnosController] Error en getSlotsRango:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error al obtener slots por rango' 
      });
    }
  }

  async getConfiguracion(req: Request, res: Response) {
    try {
      const { id: usuarioId } = req.user!;
      console.log('🔍 [TurnosController] getConfiguracion - usuarioId:', usuarioId);
      
      const [disponibilidades, vacaciones, excepciones] = await Promise.all([
        this.disponibilidadRepository.findDisponibilidadByProfesional(usuarioId),
        this.disponibilidadRepository.findVacacionesByProfesional(usuarioId),
        this.disponibilidadRepository.findExcepcionesByProfesional(usuarioId)
      ]);
      
      console.log('🔍 [TurnosController] Resultados:', {
        disponibilidades: disponibilidades.length,
        vacaciones: vacaciones.length,
        excepciones: excepciones.length
      });
      
      res.json({ 
        success: true, 
        data: { disponibilidades, vacaciones, excepciones } 
      });
    } catch (error: any) {
      console.error('💥 [TurnosController] Error en getConfiguracion:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error al obtener configuración' 
      });
    }
  }

  // CRUD Disponibilidad
  async createDisponibilidad(req: Request, res: Response) {
    try {
      const { empresaId, id: usuarioId } = req.user!;
      const { dia_inicio, dia_fin, hora_inicio, hora_fin, intervalo_minutos, profesional_id } = req.body;
      
      const disponibilidad = await this.createDisponibilidadUseCase.execute(
        profesional_id,
        dia_inicio,
        dia_fin,
        hora_inicio,
        hora_fin,
        intervalo_minutos,
        empresaId,
        usuarioId
      );
      
      res.status(201).json({ success: true, data: disponibilidad });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error al crear disponibilidad' 
      });
    }
  }

  async updateDisponibilidad(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { id: usuarioId } = req.user!;
      
      const disponibilidad = await this.updateDisponibilidadUseCase.execute(id, req.body, usuarioId);
      
      res.json({ success: true, data: disponibilidad });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error al actualizar disponibilidad' 
      });
    }
  }

  async deleteDisponibilidad(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { id: usuarioId } = req.user!;
      
      await this.deleteDisponibilidadUseCase.execute(id, usuarioId);
      
      res.json({ success: true, message: 'Disponibilidad eliminada correctamente' });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error al eliminar disponibilidad' 
      });
    }
  }

  // CRUD Vacaciones
  async createVacacion(req: Request, res: Response) {
    try {
      const { empresaId, id: usuarioId } = req.user!;
      const { fecha, fecha_fin, tipo, motivo } = req.body;
      
      const vacacion = await this.createVacacionUseCase.execute(
        usuarioId, // Usar el usuario autenticado, no el del body
        fecha,
        fecha_fin,
        tipo,
        motivo,
        empresaId,
        usuarioId
      );
      
      res.status(201).json({ success: true, data: vacacion });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error al crear vacación' 
      });
    }
  }

  async updateVacacion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { id: usuarioId } = req.user!;
      
      const vacacion = await this.updateVacacionUseCase.execute(id, req.body, usuarioId);
      
      res.json({ success: true, data: vacacion });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error al actualizar vacación' 
      });
    }
  }

  async deleteVacacion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { id: usuarioId } = req.user!;
      
      await this.deleteVacacionUseCase.execute(id, usuarioId);
      
      res.json({ success: true, message: 'Vacación eliminada correctamente' });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error al eliminar vacación' 
      });
    }
  }

  // CRUD Excepciones
  async createExcepcion(req: Request, res: Response) {
    try {
      const { empresaId, id: usuarioId } = req.user!;
      const { fecha, disponible, hora_inicio, hora_fin, intervalo_minutos, notas } = req.body;
      
      const excepcion = await this.createExcepcionUseCase.execute(
        usuarioId, // Usar el usuario autenticado, no el del body
        fecha,
        disponible,
        hora_inicio,
        hora_fin,
        intervalo_minutos,
        notas,
        empresaId,
        usuarioId
      );
      
      res.status(201).json({ success: true, data: excepcion });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error al crear excepción' 
      });
    }
  }

  async updateExcepcion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { id: usuarioId } = req.user!;
      
      const excepcion = await this.updateExcepcionUseCase.execute(id, req.body, usuarioId);
      
      res.json({ success: true, data: excepcion });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error al actualizar excepción' 
      });
    }
  }

  async deleteExcepcion(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { id: usuarioId } = req.user!;
      
      await this.deleteExcepcionUseCase.execute(id, usuarioId);
      
      res.json({ success: true, message: 'Excepción eliminada correctamente' });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error al eliminar excepción' 
      });
    }
  }

  async getCalendario(req: Request, res: Response) {
    try {
      const { profesionalId, fechaInicio, fechaFin } = req.query;
      
      // Validar que los tres parámetros existan
      if (!profesionalId || !fechaInicio || !fechaFin) {
        return res.status(400).json({
          success: false,
          message: 'Los parámetros profesionalId, fechaInicio y fechaFin son requeridos'
        });
      }
      
      const turnos = await this.getCalendarioUseCase.execute(
        profesionalId as string,
        fechaInicio as string,
        fechaFin as string
      );
      
      res.json({ success: true, data: turnos });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error al obtener calendario' 
      });
    }
  }
}
