import { Request, Response } from 'express';
import { PostgresAdminRepository } from '../../infrastructure/repositories/PostgresAdminRepository';
import { GetEmpresasAdminUseCase } from '../../application/use-cases/admin/GetEmpresasAdminUseCase';
import { GetEmpresaDetalleAdminUseCase } from '../../application/use-cases/admin/GetEmpresaDetalleAdminUseCase';
import { ToggleEmpresaActivoAdminUseCase } from '../../application/use-cases/admin/ToggleEmpresaActivoAdminUseCase';
import { GetGlobalStatsUseCase } from '../../application/use-cases/admin/GetGlobalStatsUseCase';

export class AdminController {
  private getEmpresasUseCase: GetEmpresasAdminUseCase;
  private getEmpresaDetalleUseCase: GetEmpresaDetalleAdminUseCase;
  private toggleEmpresaActivoUseCase: ToggleEmpresaActivoAdminUseCase;
  private getGlobalStatsUseCase: GetGlobalStatsUseCase;

  constructor() {
    const adminRepository = new PostgresAdminRepository();
    this.getEmpresasUseCase = new GetEmpresasAdminUseCase(adminRepository);
    this.getEmpresaDetalleUseCase = new GetEmpresaDetalleAdminUseCase(adminRepository);
    this.toggleEmpresaActivoUseCase = new ToggleEmpresaActivoAdminUseCase(adminRepository);
    this.getGlobalStatsUseCase = new GetGlobalStatsUseCase(adminRepository);
  }

  async getEmpresas(req: Request, res: Response): Promise<void> {
    try {
      const empresas = await this.getEmpresasUseCase.execute();
      res.json({ success: true, data: empresas });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al obtener empresas';
      res.status(statusCode).json({ success: false, message });
    }
  }

  async getEmpresaDetalle(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresa = await this.getEmpresaDetalleUseCase.execute(id as string);
      res.json({ success: true, data: empresa });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al obtener empresa';
      res.status(statusCode).json({ success: false, message });
    }
  }

  async toggleEmpresaActivo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const empresa = await this.toggleEmpresaActivoUseCase.execute(id as string);
      res.json({ success: true, data: empresa });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al cambiar estado de la empresa';
      res.status(statusCode).json({ success: false, message });
    }
  }

  async getGlobalStats(req: Request, res: Response): Promise<void> {
    try {
      const stats = await this.getGlobalStatsUseCase.execute();
      res.json({ success: true, data: stats });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al obtener estadísticas';
      res.status(statusCode).json({ success: false, message });
    }
  }
}
