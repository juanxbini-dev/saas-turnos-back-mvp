import { Request, Response } from 'express';
import { N8nService } from '../../infrastructure/services/n8n.service';
import { PostgresClienteRepository } from '../../infrastructure/repositories/PostgresClienteRepository';
import { PostgresUsuarioRepository } from '../../infrastructure/repositories/PostgresUsuarioRepository';
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

  private n8nService = new N8nService();

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

      // Responder al usuario inmediatamente — n8n va en background
      res.status(201).json({ success: true, data: turno });

      // Fire-and-forget: notificar a n8n sin bloquear la respuesta
      this.notificarN8nTurnoInterno(turno).catch((err) => {
        console.error('[n8n] ❌ Error inesperado en notificación (flujo interno):', err);
      });

    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error al crear turno'
      });
    }
  }

  /**
   * Obtiene los datos enriquecidos del turno (cliente + profesional) y llama a n8n.
   * Privado — solo para notificaciones post-creación.
   */
  private async notificarN8nTurnoInterno(turno: any): Promise<void> {
    try {
      const clienteRepo = new PostgresClienteRepository();
      const usuarioRepo = new PostgresUsuarioRepository();

      const [cliente, profesional] = await Promise.all([
        clienteRepo.findById(turno.cliente_id),
        usuarioRepo.findById(turno.usuario_id)
      ]);

      if (!cliente || !profesional) {
        console.error('[TurnosController] No se encontró cliente o profesional para notificar n8n', {
          turnoId: turno.id, clienteId: turno.cliente_id, profesionalId: turno.usuario_id
        });
        return;
      }

      // TODO: Reemplazar N8nService.getTelefonoPrueba() por N8nService.normalizarTelefono(cliente.telefono)
      // cuando se pase a producción real con los teléfonos de los clientes.
      const resultado = await this.n8nService.notificarTurnoCreado({
        appointment_id: turno.id,
        customer_name: cliente.nombre,
        customer_email: cliente.email,
        customer_phone: N8nService.getTelefonoPrueba(),
        service_id: turno.servicio_id,
        service_name: turno.servicio,
        professional_id: turno.usuario_id,
        professional_name: profesional.nombre,
        appointment_date: N8nService.formatearAppointmentDate(turno.fecha, turno.hora)
      });

      if (resultado.success) {
        console.log(`[n8n] ✅ Notificaciones enviadas — turno: ${turno.id} | WhatsApp: ${resultado.whatsapp_enviado ? '✅' : '❌'} | Email: ${resultado.email_enviado ? '✅' : '❌'}`);
      } else {
        console.warn(`[n8n] ⚠️ Notificación fallida — turno: ${turno.id} (el cron reintentará en 15 min)`);
      }
    } catch (error) {
      console.error('[n8n] ❌ Error preparando payload para n8n:', error);
    }
  }

  async updateEstado(req: Request, res: Response) {
    try {
      const id = req.params['id'] as string;
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

  async finalizarTurno(req: Request, res: Response) {
    try {
      const id = req.params['id'] as string;
      const { empresaId } = req.user!;
      const { metodoPago, precioModificado, descuentoPorcentaje, productos } = req.body;

      // Importamos dinámicamente para evitar dependencia circular
      const { FinalizarTurnoUseCase } = await import('../../application/use-cases/turnos/FinalizarTurnoUseCase');
      const { PostgresComisionRepository } = await import('../../infrastructure/repositories/PostgresComisionRepository');
      const { PostgresVentaProductoRepository } = await import('../../infrastructure/repositories/PostgresVentaProductoRepository');
      const { PostgresUsuarioRepository } = await import('../../infrastructure/repositories/PostgresUsuarioRepository');
      const { PostgresProductoRepository } = await import('../../infrastructure/repositories/PostgresProductoRepository');

      // Obtener el turno para usar el profesional_id real del dueño del turno,
      // no el id del usuario autenticado (que puede ser un admin actuando en nombre del profesional)
      const turnoRepository = this.getTurnosUseCase['turnoRepository'];
      const turnoExistente = await turnoRepository.findById(id);
      if (!turnoExistente) {
        return res.status(404).json({ success: false, message: 'Turno no encontrado' });
      }

      const finalizarUseCase = new FinalizarTurnoUseCase(
        turnoRepository,
        new PostgresUsuarioRepository(),
        new PostgresComisionRepository(),
        new PostgresVentaProductoRepository(),
        new PostgresProductoRepository()
      );

      const turno = await finalizarUseCase.execute({
        turnoId: id,
        profesionalId: turnoExistente.profesional_id,
        empresaId: empresaId,
        metodoPago,
        precioModificado,
        descuentoPorcentaje,
        productos
      });
      
      res.json({ success: true, data: turno });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error al finalizar turno' 
      });
    }
  }

  async getDisponibilidadMes(req: Request, res: Response) {
    try {
      const profesionalId = req.params['profesionalId'] as string;
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
      const profesionalId = req.params['profesionalId'] as string;
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
      const profesionalId = req.params['profesionalId'] as string;
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
      const { id: usuarioId, roles } = req.user!;
      const isSuperAdmin = roles.includes('super_admin');
      const efectivoId = isSuperAdmin && req.query.profesionalId
        ? req.query.profesionalId as string
        : usuarioId;

      console.log('🔍 [TurnosController] getConfiguracion - efectivoId:', efectivoId);

      const [disponibilidades, vacaciones, excepciones] = await Promise.all([
        this.disponibilidadRepository.findDisponibilidadByProfesional(efectivoId),
        this.disponibilidadRepository.findVacacionesByProfesional(efectivoId),
        this.disponibilidadRepository.findExcepcionesByProfesional(efectivoId)
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
      const { empresaId, id: usuarioId, roles } = req.user!;
      const { dia_inicio, dia_fin, hora_inicio, hora_fin, intervalo_minutos, profesional_id } = req.body;
      const isSuperAdmin = roles.includes('super_admin');
      const efectivoId = isSuperAdmin && profesional_id ? profesional_id : usuarioId;

      const disponibilidad = await this.createDisponibilidadUseCase.execute(
        efectivoId,
        dia_inicio,
        dia_fin,
        hora_inicio,
        hora_fin,
        intervalo_minutos,
        empresaId,
        efectivoId
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
      const id = req.params['id'] as string;
      const { id: usuarioId, roles } = req.user!;
      const isSuperAdmin = roles.includes('super_admin');
      const efectivoId = isSuperAdmin && req.body.profesional_id ? req.body.profesional_id : usuarioId;

      const disponibilidad = await this.updateDisponibilidadUseCase.execute(id, req.body, efectivoId);
      
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
      const id = req.params['id'] as string;
      const { id: usuarioId, roles } = req.user!;
      const isSuperAdmin = roles.includes('super_admin');
      const efectivoId = isSuperAdmin && req.body.profesional_id ? req.body.profesional_id : usuarioId;

      await this.deleteDisponibilidadUseCase.execute(id, efectivoId);
      
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
      const { empresaId, id: usuarioId, roles } = req.user!;
      const { fecha, fecha_fin, tipo, motivo, profesional_id } = req.body;
      const isSuperAdmin = roles.includes('super_admin');
      const efectivoId = isSuperAdmin && profesional_id ? profesional_id : usuarioId;

      const vacacion = await this.createVacacionUseCase.execute(
        efectivoId,
        fecha,
        fecha_fin,
        tipo,
        motivo,
        empresaId,
        efectivoId
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
      const id = req.params['id'] as string;
      const { id: usuarioId, roles } = req.user!;
      const isSuperAdmin = roles.includes('super_admin');
      const efectivoId = isSuperAdmin && req.body.profesional_id ? req.body.profesional_id : usuarioId;

      const vacacion = await this.updateVacacionUseCase.execute(id, req.body, efectivoId);
      
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
      const id = req.params['id'] as string;
      const { id: usuarioId, roles } = req.user!;
      const isSuperAdmin = roles.includes('super_admin');
      const efectivoId = isSuperAdmin && req.body.profesional_id ? req.body.profesional_id : usuarioId;

      await this.deleteVacacionUseCase.execute(id, efectivoId);
      
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
      const { empresaId, id: usuarioId, roles } = req.user!;
      const { fecha, disponible, tipo, hora_inicio, hora_fin, intervalo_minutos, notas, profesional_id } = req.body;
      const isAdmin = roles?.includes('super_admin') || roles?.includes('admin');
      const efectivoId = isAdmin && profesional_id ? profesional_id : usuarioId;

      const excepcion = await this.createExcepcionUseCase.execute(
        efectivoId,
        fecha,
        disponible,
        hora_inicio,
        hora_fin,
        intervalo_minutos,
        notas,
        empresaId,
        efectivoId,
        tipo || 'reemplazo'
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
      const id = req.params['id'] as string;
      const { id: usuarioId, roles } = req.user!;
      const isAdmin = roles?.includes('super_admin') || roles?.includes('admin');
      const efectivoId = isAdmin && req.body.profesional_id ? req.body.profesional_id : usuarioId;

      const excepcion = await this.updateExcepcionUseCase.execute(id, req.body, efectivoId);
      
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
      const id = req.params['id'] as string;
      const { id: usuarioId, roles } = req.user!;
      const isAdmin = roles?.includes('super_admin') || roles?.includes('admin');
      const efectivoId = isAdmin && req.body.profesional_id ? req.body.profesional_id : usuarioId;

      await this.deleteExcepcionUseCase.execute(id, efectivoId);
      
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
