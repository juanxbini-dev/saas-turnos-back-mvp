import { Request, Response } from 'express';
import { UpdateAvatarUseCase } from '../../application/use-cases/perfil/UpdateAvatarUseCase';
import { DeleteAvatarUseCase } from '../../application/use-cases/perfil/DeleteAvatarUseCase';
import { GetProfileUseCase } from '../../application/use-cases/perfil/GetProfileUseCase';
import { CloudinaryImageRepository } from '../../infrastructure/repositories/CloudinaryImageRepository';
import { PostgresUsuarioRepository } from '../../infrastructure/repositories/PostgresUsuarioRepository';
import { AuthenticatedUser } from '../middlewares/auth.middleware';

export class PerfilController {
  private updateAvatarUseCase: UpdateAvatarUseCase;
  private deleteAvatarUseCase: DeleteAvatarUseCase;
  private getProfileUseCase: GetProfileUseCase;

  constructor() {
    const imageRepository = new CloudinaryImageRepository();
    const usuarioRepository = new PostgresUsuarioRepository();

    this.updateAvatarUseCase = new UpdateAvatarUseCase(imageRepository, usuarioRepository);
    this.deleteAvatarUseCase = new DeleteAvatarUseCase(imageRepository, usuarioRepository);
    this.getProfileUseCase = new GetProfileUseCase(usuarioRepository);
  }

  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      const profile = await this.getProfileUseCase.execute(user.id);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al obtener perfil';

      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  async uploadAvatar(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No se envio ninguna imagen'
        });
        return;
      }

      const profile = await this.updateAvatarUseCase.execute(user.id, req.file.buffer);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al subir avatar';

      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  async deleteAvatar(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      const profile = await this.deleteAvatarUseCase.execute(user.id);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al eliminar avatar';

      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }
}
