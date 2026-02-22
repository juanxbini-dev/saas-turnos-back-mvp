import { Request, Response } from 'express';
import { UpdateTurnoEstadoUseCase } from '../../application/use-cases/turnos/UpdateTurnoEstadoUseCase';
import { PostgresTurnoRepository } from '../../infrastructure/repositories/PostgresTurnoRepository';

export class MailDeliveryController {
  constructor(private updateTurnoEstadoUseCase: UpdateTurnoEstadoUseCase) {}

  async confirmarTurno(req: Request, res: Response) {
    try {
      const { turnoId } = req.params;
      
      if (!turnoId || typeof turnoId !== 'string') {
        return res.status(400).json({
          success: false,
          message: 'turnoId es requerido y debe ser un string'
        });
      }
      
      console.log('📧 [MAIL DELIVERY] Simulando confirmación de email para turno:', turnoId);
      
      // Simular que el mail delivery fue exitoso
      console.log('✅ [MAIL DELIVERY] Email enviado exitosamente!');
      
      // Actualizar estado a confirmado
      console.log('🔍 [MAIL DELIVERY] Actualizando estado a confirmado...');
      const turnoConfirmado = await this.updateTurnoEstadoUseCase.execute(turnoId, 'confirmado');
      console.log('🔍 [MAIL DELIVERY] Turno confirmado:', turnoConfirmado);
      
      res.json({ 
        success: true, 
        message: 'Mail delivery confirmado y turno actualizado',
        data: turnoConfirmado 
      });
    } catch (error: any) {
      console.error('💥 [MAIL DELIVERY] Error:', error);
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({ 
        success: false, 
        message: error.message || 'Error en mail delivery' 
      });
    }
  }
}
