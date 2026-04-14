import { Request, Response } from 'express';
import { N8nService } from '../../../infrastructure/services/n8n.service';
import { CreateTurnoPublicUseCase } from '../../../application/use-cases/public/CreateTurnoPublicUseCase';
import { PostgresTurnoRepository } from '../../../infrastructure/repositories/PostgresTurnoRepository';
import { PostgresClienteRepository } from '../../../infrastructure/repositories/PostgresClienteRepository';
import { PostgresServicioRepository } from '../../../infrastructure/repositories/PostgresServicioRepository';
import { PostgresDisponibilidadRepository } from '../../../infrastructure/repositories/PostgresDisponibilidadRepository';
import { PostgresBloqueoSlotRepository } from '../../../infrastructure/repositories/PostgresBloqueoSlotRepository';
import { DisponibilidadService } from '../../../domain/services/DisponibilidadService';

export class TurnoPublicController {
  private createTurnoPublicUseCase: CreateTurnoPublicUseCase;
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

      if (!cliente_data.nombre || !cliente_data.email) {
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

      // Fire-and-forget: notificar a n8n con los datos del request (ya los tenemos sin queries extra)
      // TODO: Reemplazar N8nService.getTelefonoPrueba() por N8nService.normalizarTelefono(cliente_data.telefono)
      // cuando se pase a producción real con los teléfonos de los clientes.
      this.n8nService.notificarTurnoCreado({
        appointment_id: turno.id,
        customer_name: cliente_data.nombre,
        customer_email: cliente_data.email,
        customer_phone: N8nService.getTelefonoPrueba(),
        service_id: servicio_id,
        service_name: turno.servicio_nombre,
        professional_id: profesional_id,
        professional_name: turno.profesional_nombre || '',
        appointment_date: N8nService.formatearAppointmentDate(fecha, hora)
      }).then((resultado) => {
        if (resultado.success) {
          console.log(`[n8n] ✅ Notificaciones enviadas — turno: ${turno.id} | WhatsApp: ${resultado.whatsapp_enviado ? '✅' : '❌'} | Email: ${resultado.email_enviado ? '✅' : '❌'}`);
        } else {
          console.warn(`[n8n] ⚠️ Notificación fallida — turno: ${turno.id} (el cron reintentará en 15 min)`);
        }
      }).catch((err) => {
        console.error('[n8n] ❌ Error inesperado en notificación (flujo público):', err);
      });

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
}
