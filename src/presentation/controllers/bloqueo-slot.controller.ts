import { Request, Response } from 'express';
import { CreateBloqueoSlotUseCase } from '../../application/use-cases/bloqueo-slot/CreateBloqueoSlotUseCase';
import { DeleteBloqueoSlotUseCase } from '../../application/use-cases/bloqueo-slot/DeleteBloqueoSlotUseCase';
import { GetBloqueosSlotUseCase } from '../../application/use-cases/bloqueo-slot/GetBloqueosSlotUseCase';

export class BloqueoSlotController {
  constructor(
    private createBloqueoSlotUseCase: CreateBloqueoSlotUseCase,
    private deleteBloqueoSlotUseCase: DeleteBloqueoSlotUseCase,
    private getBloqueosSlotUseCase: GetBloqueosSlotUseCase
  ) {}

  async create(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId, id: usuarioId } = req.user!;
      const { fecha, hora_inicio, hora_fin, motivo } = req.body;

      const bloqueo = await this.createBloqueoSlotUseCase.execute(
        usuarioId,
        empresaId,
        fecha,
        hora_inicio,
        hora_fin,
        motivo ?? null,
        usuarioId
      );

      res.status(201).json({ success: true, data: bloqueo });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const { id: usuarioId } = req.user!;
      const { id } = req.params;

      await this.deleteBloqueoSlotUseCase.execute(id as string, usuarioId, usuarioId);

      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async getByRango(req: Request, res: Response): Promise<void> {
    try {
      const { id: usuarioId } = req.user!;
      const { fecha_inicio, fecha_fin } = req.query;

      if (!fecha_inicio || !fecha_fin) {
        res.status(400).json({ success: false, message: 'fecha_inicio y fecha_fin son requeridos' });
        return;
      }

      const bloqueos = await this.getBloqueosSlotUseCase.executeByRango(
        usuarioId,
        fecha_inicio as string,
        fecha_fin as string
      );

      res.status(200).json({ success: true, data: bloqueos });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }
}
