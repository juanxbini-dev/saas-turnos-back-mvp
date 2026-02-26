import { Request, Response } from 'express';
import { CreateTurnoPublicUseCase } from '../../../application/use-cases/public/CreateTurnoPublicUseCase';
import { PostgresTurnoRepository } from '../../../infrastructure/repositories/PostgresTurnoRepository';
import { PostgresClienteRepository } from '../../../infrastructure/repositories/PostgresClienteRepository';
import { PostgresServicioRepository } from '../../../infrastructure/repositories/PostgresServicioRepository';

export class TurnoPublicController {
  private createTurnoPublicUseCase: CreateTurnoPublicUseCase;

  constructor() {
    const turnoRepository = new PostgresTurnoRepository();
    const clienteRepository = new PostgresClienteRepository();
    const servicioRepository = new PostgresServicioRepository();
    
    this.createTurnoPublicUseCase = new CreateTurnoPublicUseCase(
      turnoRepository,
      clienteRepository,
      servicioRepository
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

      res.status(201).json({
        success: true,
        message: 'Turno creado exitosamente',
        data: turno
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

      if (error.message === 'El horario seleccionado ya no está disponible') {
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
