import { Request, Response } from 'express';
import { AuthenticatedUser } from '../middlewares/auth.middleware';
import { GetConfigUseCase } from '../../application/use-cases/configuracion/GetConfigUseCase';
import { UpdateConfigUseCase } from '../../application/use-cases/configuracion/UpdateConfigUseCase';
import { UploadImagenConfigUseCase } from '../../application/use-cases/configuracion/UploadImagenConfigUseCase';
import { GetProfesionalesConfigUseCase } from '../../application/use-cases/configuracion/GetProfesionalesConfigUseCase';
import { UpdateProfesionalConfigUseCase } from '../../application/use-cases/configuracion/UpdateProfesionalConfigUseCase';
import { UpdateOrdenUseCase } from '../../application/use-cases/configuracion/UpdateOrdenUseCase';
import { UpdateAvatarUseCase } from '../../application/use-cases/perfil/UpdateAvatarUseCase';
import { PostgresLandingConfigRepository, PostgresLandingProfesionalRepository } from '../../infrastructure/repositories/PostgresLandingConfigRepository';
import { CloudinaryImageRepository } from '../../infrastructure/repositories/CloudinaryImageRepository';
import { PostgresUsuarioRepository } from '../../infrastructure/repositories/PostgresUsuarioRepository';

export class ConfiguracionController {
  private getConfigUseCase: GetConfigUseCase;
  private updateConfigUseCase: UpdateConfigUseCase;
  private uploadImagenConfigUseCase: UploadImagenConfigUseCase;
  private getProfesionalesConfigUseCase: GetProfesionalesConfigUseCase;
  private updateProfesionalConfigUseCase: UpdateProfesionalConfigUseCase;
  private updateOrdenUseCase: UpdateOrdenUseCase;
  private updateAvatarUseCase: UpdateAvatarUseCase;

  constructor() {
    const landingConfigRepo = new PostgresLandingConfigRepository();
    const landingProfesionalRepo = new PostgresLandingProfesionalRepository();
    const imageRepo = new CloudinaryImageRepository();
    const usuarioRepo = new PostgresUsuarioRepository();

    this.getConfigUseCase = new GetConfigUseCase(landingConfigRepo);
    this.updateConfigUseCase = new UpdateConfigUseCase(landingConfigRepo);
    this.uploadImagenConfigUseCase = new UploadImagenConfigUseCase(landingConfigRepo, imageRepo);
    this.getProfesionalesConfigUseCase = new GetProfesionalesConfigUseCase(landingProfesionalRepo, usuarioRepo);
    this.updateProfesionalConfigUseCase = new UpdateProfesionalConfigUseCase(landingProfesionalRepo);
    this.updateOrdenUseCase = new UpdateOrdenUseCase(landingProfesionalRepo);
    this.updateAvatarUseCase = new UpdateAvatarUseCase(imageRepo, usuarioRepo);
  }

  async getConfig(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      const config = await this.getConfigUseCase.execute(user.empresaId);
      res.json({ success: true, data: config });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener configuracion' });
    }
  }

  async updateConfig(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      const { titulo, descripcion, direccion, direccion_maps, horarios_texto } = req.body;
      const config = await this.updateConfigUseCase.execute(user.empresaId, { titulo, descripcion, direccion, direccion_maps, horarios_texto });
      res.json({ success: true, data: config });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al actualizar configuracion' });
    }
  }

  async uploadLogo(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No se envio ninguna imagen' });
        return;
      }
      const config = await this.uploadImagenConfigUseCase.execute(user.empresaId, 'logo', req.file.buffer);
      res.json({ success: true, data: config });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al subir logo' });
    }
  }

  async uploadFondo(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No se envio ninguna imagen' });
        return;
      }
      const config = await this.uploadImagenConfigUseCase.execute(user.empresaId, 'fondo', req.file.buffer);
      res.json({ success: true, data: config });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al subir imagen de fondo' });
    }
  }

  async getProfesionales(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      const profesionales = await this.getProfesionalesConfigUseCase.execute(user.empresaId);
      res.json({ success: true, data: profesionales });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener profesionales' });
    }
  }

  async updateProfesional(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      const usuarioId = req.params.usuarioId as string;
      const { subtitulo, descripcion, visible } = req.body;
      const result = await this.updateProfesionalConfigUseCase.execute(user.empresaId, usuarioId, { subtitulo, descripcion, visible });
      res.json({ success: true, data: result });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al actualizar profesional' });
    }
  }

  async uploadAvatarProfesional(req: Request, res: Response): Promise<void> {
    try {
      const usuarioId = req.params.usuarioId as string;

      if (!req.file) {
        res.status(400).json({ success: false, message: 'No se envio ninguna imagen' });
        return;
      }

      const usuario = await this.updateAvatarUseCase.execute(usuarioId, req.file.buffer);
      res.json({ success: true, data: usuario });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error instanceof Error ? error.message : 'Error al subir avatar'
      });
    }
  }

  async updateOrden(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      const { orden } = req.body;
      if (!Array.isArray(orden)) {
        res.status(400).json({ success: false, message: 'orden debe ser un array' });
        return;
      }
      await this.updateOrdenUseCase.execute(user.empresaId, orden);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al actualizar orden' });
    }
  }
}
