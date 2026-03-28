import { Request, Response } from 'express';
import { AuthenticatedUser } from '../middlewares/auth.middleware';
import { GetMarcasUseCase } from '../../application/use-cases/marcas/GetMarcasUseCase';
import { CreateMarcaUseCase } from '../../application/use-cases/marcas/CreateMarcaUseCase';
import { UpdateMarcaUseCase } from '../../application/use-cases/marcas/UpdateMarcaUseCase';
import { DeleteMarcaUseCase } from '../../application/use-cases/marcas/DeleteMarcaUseCase';
import { PostgresMarcaRepository } from '../../infrastructure/repositories/PostgresMarcaRepository';

export class MarcasController {
  private getMarcasUseCase: GetMarcasUseCase;
  private createMarcaUseCase: CreateMarcaUseCase;
  private updateMarcaUseCase: UpdateMarcaUseCase;
  private deleteMarcaUseCase: DeleteMarcaUseCase;

  constructor() {
    const repo = new PostgresMarcaRepository();
    this.getMarcasUseCase = new GetMarcasUseCase(repo);
    this.createMarcaUseCase = new CreateMarcaUseCase(repo);
    this.updateMarcaUseCase = new UpdateMarcaUseCase(repo);
    this.deleteMarcaUseCase = new DeleteMarcaUseCase(repo);
  }

  async getMarcas(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const marcas = await this.getMarcasUseCase.execute(empresaId);
      res.json({ success: true, data: marcas });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener marcas' });
    }
  }

  async createMarca(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const { nombre } = req.body;
      const marca = await this.createMarcaUseCase.execute(empresaId, nombre);
      res.status(201).json({ success: true, data: marca });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, message: error.message || 'Error al crear marca' });
    }
  }

  async updateMarca(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const id = req.params.id as string;
      const { nombre } = req.body;
      const marca = await this.updateMarcaUseCase.execute(id, empresaId, nombre);
      res.json({ success: true, data: marca });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, message: error.message || 'Error al actualizar marca' });
    }
  }

  async deleteMarca(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const id = req.params.id as string;
      const result = await this.deleteMarcaUseCase.execute(id, empresaId);
      res.json({ success: true, data: result });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, message: error.message || 'Error al eliminar marca' });
    }
  }
}
