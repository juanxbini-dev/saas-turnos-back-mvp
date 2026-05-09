import { Request, Response } from 'express';
import { PostgresAdminRepository } from '../../infrastructure/repositories/PostgresAdminRepository';
import { PostgresUsuarioRepository } from '../../infrastructure/repositories/PostgresUsuarioRepository';
import { PasswordService } from '../../infrastructure/security/password.service';
import { GetEmpresasAdminUseCase } from '../../application/use-cases/admin/GetEmpresasAdminUseCase';
import { GetEmpresaDetalleAdminUseCase } from '../../application/use-cases/admin/GetEmpresaDetalleAdminUseCase';
import { ToggleEmpresaActivoAdminUseCase } from '../../application/use-cases/admin/ToggleEmpresaActivoAdminUseCase';
import { GetGlobalStatsUseCase } from '../../application/use-cases/admin/GetGlobalStatsUseCase';
import { ResetUsuarioPasswordAdminUseCase } from '../../application/use-cases/admin/ResetUsuarioPasswordAdminUseCase';

export class AdminController {
  private getEmpresasUseCase: GetEmpresasAdminUseCase;
  private getEmpresaDetalleUseCase: GetEmpresaDetalleAdminUseCase;
  private toggleEmpresaActivoUseCase: ToggleEmpresaActivoAdminUseCase;
  private getGlobalStatsUseCase: GetGlobalStatsUseCase;
  private resetUsuarioPasswordUseCase: ResetUsuarioPasswordAdminUseCase;

  constructor() {
    const adminRepository = new PostgresAdminRepository();
    const usuarioRepository = new PostgresUsuarioRepository();
    const passwordService = new PasswordService();
    this.getEmpresasUseCase = new GetEmpresasAdminUseCase(adminRepository);
    this.getEmpresaDetalleUseCase = new GetEmpresaDetalleAdminUseCase(adminRepository);
    this.toggleEmpresaActivoUseCase = new ToggleEmpresaActivoAdminUseCase(adminRepository);
    this.getGlobalStatsUseCase = new GetGlobalStatsUseCase(adminRepository);
    this.resetUsuarioPasswordUseCase = new ResetUsuarioPasswordAdminUseCase(usuarioRepository, passwordService);
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

  async resetUsuarioPassword(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { nuevaPassword } = req.body;

      if (!nuevaPassword || nuevaPassword.length < 6) {
        res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres' });
        return;
      }

      await this.resetUsuarioPasswordUseCase.execute(id, nuevaPassword);
      res.json({ success: true, message: 'Contraseña reseteada correctamente' });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al resetear contraseña';
      res.status(statusCode).json({ success: false, message });
    }
  }
}
