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
      const { empresaId, id: usuarioId, roles } = req.user!;
      const { fecha, hora_inicio, hora_fin, motivo, profesional_id } = req.body;

      const isSuperAdmin = roles?.includes('super_admin') || roles?.includes('admin');
      const efectivoId = isSuperAdmin && profesional_id ? profesional_id : usuarioId;

      const bloqueo = await this.createBloqueoSlotUseCase.execute(
        efectivoId,
        empresaId,
        fecha,
        hora_inicio,
        hora_fin,
        motivo ?? null
      );

      res.status(201).json({ success: true, data: bloqueo });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async remove(req: Request, res: Response): Promise<void> {
    try {
      const { id: usuarioId, roles } = req.user!;
      const { id } = req.params;

      await this.deleteBloqueoSlotUseCase.execute(id as string, usuarioId, roles || []);

      res.status(200).json({ success: true });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }

  async getByRango(req: Request, res: Response): Promise<void> {
    try {
      const { id: usuarioId, roles } = req.user!;
      const { fecha_inicio, fecha_fin, profesional_id } = req.query;

      if (!fecha_inicio || !fecha_fin) {
        res.status(400).json({ success: false, message: 'fecha_inicio y fecha_fin son requeridos' });
        return;
      }

      const isSuperAdmin = roles?.includes('super_admin') || roles?.includes('admin');
      const efectivoId = isSuperAdmin && profesional_id ? profesional_id as string : usuarioId;

      const bloqueos = await this.getBloqueosSlotUseCase.executeByRango(
        efectivoId,
        fecha_inicio as string,
        fecha_fin as string
      );

      res.status(200).json({ success: true, data: bloqueos });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, message: error.message });
    }
  }
}
