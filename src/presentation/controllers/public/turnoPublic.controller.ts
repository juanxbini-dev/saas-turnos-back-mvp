import { Request, Response } from 'express';
import { N8nService } from '../../../infrastructure/services/n8n.service';
import { CreateTurnoPublicUseCase } from '../../../application/use-cases/public/CreateTurnoPublicUseCase';
import { GetClienteTurnosPublicUseCase } from '../../../application/use-cases/public/GetClienteTurnosPublicUseCase';
import { CancelarTurnoPublicUseCase } from '../../../application/use-cases/public/CancelarTurnoPublicUseCase';
import { PostgresTurnoRepository } from '../../../infrastructure/repositories/PostgresTurnoRepository';
import { PostgresClienteRepository } from '../../../infrastructure/repositories/PostgresClienteRepository';
import { PostgresServicioRepository } from '../../../infrastructure/repositories/PostgresServicioRepository';
import { PostgresDisponibilidadRepository } from '../../../infrastructure/repositories/PostgresDisponibilidadRepository';
import { PostgresBloqueoSlotRepository } from '../../../infrastructure/repositories/PostgresBloqueoSlotRepository';
import { PostgresUsuarioRepository } from '../../../infrastructure/repositories/PostgresUsuarioRepository';
import { DisponibilidadService } from '../../../domain/services/DisponibilidadService';

export class TurnoPublicController {
  private createTurnoPublicUseCase: CreateTurnoPublicUseCase;
  private getClienteTurnosPublicUseCase: GetClienteTurnosPublicUseCase;
  private cancelarTurnoPublicUseCase: CancelarTurnoPublicUseCase;
  private n8nService = new N8nService();

  constructor() {
    const turnoRepository = new PostgresTurnoRepository();
    const clienteRepository = new PostgresClienteRepository();
    const servicioRepository = new PostgresServicioRepository();
    const disponibilidadRepository = new PostgresDisponibilidadRepository();
    const bloqueoSlotRepository = new PostgresBloqueoSlotRepository();
    const disponibilidadService = new DisponibilidadService();

    this.createTurnoPublicUseCase = new CreateTurnoPublicUseCase(
      turnoRepository,
      clienteRepository,
      servicioRepository,
      disponibilidadRepository,
      bloqueoSlotRepository,
      disponibilidadService
    );
    this.getClienteTurnosPublicUseCase = new GetClienteTurnosPublicUseCase(clienteRepository, turnoRepository);
    this.cancelarTurnoPublicUseCase = new CancelarTurnoPublicUseCase(clienteRepository, turnoRepository);
  }

  createTurno = async (req: Request, res: Response) => {
    try {
      const {
        profesional_id,
        servicio_id,
        fecha,
        hora,
        cliente_data,
        cliente_id,
        notas
      } = req.body;

      console.log('🔍 TurnoPublic Controller - Datos recibidos:', {
        profesional_id,
        servicio_id,
        fecha,
        hora,
        cliente_data,
        cliente_id,
        notas
      });

      // Validaciones básicas
      if (!profesional_id || !servicio_id || !fecha || !hora || !cliente_data) {
        console.log('❌ TurnoPublic Controller - Faltan datos requeridos');
        return res.status(400).json({
          success: false,
          message: 'Faltan datos requeridos'
        });
      }

      if (!cliente_data.nombre || (!cliente_id && !cliente_data.email)) {
        console.log('❌ TurnoPublic Controller - Faltan datos de cliente');
        return res.status(400).json({
          success: false,
          message: 'Nombre y email del cliente son requeridos'
        });
      }

      console.log('✅ TurnoPublic Controller - Creando turno...');
      const turno = await this.createTurnoPublicUseCase.execute({
        profesional_id,
        servicio_id,
        fecha,
        hora,
        cliente_data,
        cliente_id,
        notas
      });

      // Responder al usuario inmediatamente — n8n va en background
      res.status(201).json({
        success: true,
        message: 'Turno creado exitosamente',
        data: turno
      });

      // Fire-and-forget: notificar a n8n — resolvemos el nombre del profesional en background
      (async () => {
        try {
          const usuarioRepo = new PostgresUsuarioRepository();
          const turnoRepo = new PostgresTurnoRepository();
          const profesional = await usuarioRepo.findById(profesional_id);
          const resultado = await this.n8nService.notificarTurnoCreado({
            appointment_id: turno.id,
            customer_name: cliente_data.nombre,
            customer_email: cliente_data.email,
            customer_phone: N8nService.normalizarTelefono(cliente_data.telefono),
            service_id: servicio_id,
            service_name: turno.servicio_nombre,
            professional_id: profesional_id,
            professional_name: profesional?.nombre || '',
            appointment_date: N8nService.formatearAppointmentDate(fecha, hora)
          });
          if (resultado.whatsapp_enviado) {
            await turnoRepo.marcarConfirmacionWhatsappEnviada(turno.id);
          }
          if (resultado.success) {
            console.log(`[n8n] ✅ Notificaciones enviadas — turno: ${turno.id} | WhatsApp: ${resultado.whatsapp_enviado ? '✅' : '❌'} | Email: ${resultado.email_enviado ? '✅' : '❌'}`);
          } else {
            console.warn(`[n8n] ⚠️ Notificación fallida — turno: ${turno.id}`);
          }
        } catch (err) {
          console.error('[n8n] ❌ Error inesperado en notificación (flujo público):', err);
        }
      })();

      return;
    } catch (error: any) {
      console.error('Error al crear turno público:', error);
      
      if (error.message === 'Servicio no encontrado') {
        return res.status(404).json({
          success: false,
          message: 'Servicio no encontrado'
        });
      }

      const statusCode = error.statusCode || 500;
      if (statusCode === 409 || error.code === '23505') {
        return res.status(409).json({
          success: false,
          message: 'El horario seleccionado ya no está disponible'
        });
      }

      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
      return;
    }
  };

  getTurnosCliente = async (req: Request, res: Response) => {
    try {
      const profesional_id = req.query.profesional_id as string | undefined;
      const empresa_id = req.query.empresa_id as string | undefined;
      const email = req.query.email as string | undefined;
      const telefono = req.query.telefono as string | undefined;

      if (!profesional_id || !empresa_id) {
        return res.status(400).json({ success: false, message: 'Faltan parámetros requeridos' });
      }
      if (!email && !telefono) {
        return res.status(400).json({ success: false, message: 'Se requiere email o teléfono' });
      }

      const result = await this.getClienteTurnosPublicUseCase.execute({
        profesional_id,
        empresa_id,
        email: email || undefined,
        telefono: telefono || undefined
      });

      return res.status(200).json({ success: true, data: result });
    } catch (error: any) {
      return res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  };

  cancelarTurnoPublico = async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const email = req.body.email as string | undefined;
      const telefono = req.body.telefono as string | undefined;
      const empresa_id = req.body.empresa_id as string | undefined;

      if (!empresa_id) {
        return res.status(400).json({ success: false, message: 'Falta empresa_id' });
      }
      if (!email && !telefono) {
        return res.status(400).json({ success: false, message: 'Se requiere email o teléfono' });
      }

      const turno = await this.cancelarTurnoPublicUseCase.execute({
        turno_id: id as string,
        email: email || undefined,
        telefono: telefono || undefined,
        empresa_id: empresa_id as string
      });

      // Fire-and-forget: notificar cancelación a n8n solo si el profesional tiene teléfono
      (async () => {
        try {
          const usuarioRepo = new PostgresUsuarioRepository();
          const profesional = await usuarioRepo.findById(turno.profesional_id);

          if (!profesional?.telefono) {
            console.log(`[n8n] Cancelación sin notificar — profesional ${turno.profesional_id} no tiene teléfono`);
            return;
          }

          await this.n8nService.notificarCancelacionTurno({
            turno_id: turno.id,
            customer_name: turno.cliente_nombre,
            customer_email: turno.cliente_email,
            customer_phone: N8nService.normalizarTelefono(turno.cliente_telefono || ''),
            service_name: turno.servicio,
            professional_id: turno.profesional_id,
            professional_name: turno.profesional_nombre,
            professional_phone: N8nService.normalizarTelefono(profesional.telefono),
            appointment_date: N8nService.formatearAppointmentDate(turno.fecha, turno.hora),
            fecha: turno.fecha,
            hora: turno.hora
          });
        } catch (err) {
          console.error('[n8n] Error al notificar cancelación:', err);
        }
      })();

      return res.status(200).json({ success: true, data: turno });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      const response: any = { success: false, message: error.message || 'Error interno' };
      if (error.code === 'LIMITE_CANCELACION') {
        response.code = 'LIMITE_CANCELACION';
        response.profesional_nombre = error.profesional_nombre;
      }
      return res.status(statusCode).json(response);
    }
  };
}
