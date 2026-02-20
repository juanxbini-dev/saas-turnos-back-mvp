import { Request, Response } from 'express';
import { GetUsuariosUseCase } from '../../application/use-cases/usuarios/GetUsuariosUseCase';
import { CreateUsuarioUseCase } from '../../application/use-cases/usuarios/CreateUsuarioUseCase';
import { UpdateUsuarioDatosUseCase } from '../../application/use-cases/usuarios/UpdateUsuarioDatosUseCase';
import { UpdateUsuarioPasswordUseCase } from '../../application/use-cases/usuarios/UpdateUsuarioPasswordUseCase';
import { UpdateUsuarioRolUseCase } from '../../application/use-cases/usuarios/UpdateUsuarioRolUseCase';
import { ToggleUsuarioActivoUseCase } from '../../application/use-cases/usuarios/ToggleUsuarioActivoUseCase';
import { PostgresUsuarioRepository } from '../../infrastructure/repositories/PostgresUsuarioRepository';
import { PasswordService } from '../../infrastructure/security/password.service';
import { CryptoService } from '../../infrastructure/security/crypto.service';
import { AuthenticatedUser } from '../middlewares/auth.middleware';

export class UsuariosController {
  private getUsuariosUseCase: GetUsuariosUseCase;
  private createUsuarioUseCase: CreateUsuarioUseCase;
  private updateUsuarioDatosUseCase: UpdateUsuarioDatosUseCase;
  private updateUsuarioPasswordUseCase: UpdateUsuarioPasswordUseCase;
  private updateUsuarioRolUseCase: UpdateUsuarioRolUseCase;
  private toggleUsuarioActivoUseCase: ToggleUsuarioActivoUseCase;

  constructor() {
    const usuarioRepository = new PostgresUsuarioRepository();
    const passwordService = new PasswordService();
    const cryptoService = new CryptoService();

    this.getUsuariosUseCase = new GetUsuariosUseCase(usuarioRepository);
    this.createUsuarioUseCase = new CreateUsuarioUseCase(
      usuarioRepository,
      passwordService,
      cryptoService
    );
    this.updateUsuarioDatosUseCase = new UpdateUsuarioDatosUseCase(usuarioRepository);
    this.updateUsuarioPasswordUseCase = new UpdateUsuarioPasswordUseCase(
      usuarioRepository,
      passwordService
    );
    this.updateUsuarioRolUseCase = new UpdateUsuarioRolUseCase(usuarioRepository);
    this.toggleUsuarioActivoUseCase = new ToggleUsuarioActivoUseCase(usuarioRepository);
  }

  async getUsuarios(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      const usuarios = await this.getUsuariosUseCase.execute(user.empresaId);
      
      res.json({
        success: true,
        data: usuarios
      });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al obtener usuarios';
      
      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  async createUsuario(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      const { nombre, username, password, email, rol } = req.body;

      if (!nombre || !username || !password || !email || !rol) {
        res.status(400).json({
          success: false,
          message: 'Todos los campos son requeridos'
        });
        return;
      }

      const usuario = await this.createUsuarioUseCase.execute({
        nombre,
        username,
        password,
        email,
        empresa_id: user.empresaId,
        rol
      });

      res.status(201).json({
        success: true,
        data: usuario
      });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al crear usuario';
      
      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  async updateDatos(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { nombre, username } = req.body;

      if (!nombre || !username) {
        res.status(400).json({
          success: false,
          message: 'Nombre y username son requeridos'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID de usuario es requerido'
        });
        return;
      }

      const usuario = await this.updateUsuarioDatosUseCase.execute(id as string, { nombre, username });

      res.json({
        success: true,
        data: usuario
      });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al actualizar datos del usuario';
      
      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  async updatePassword(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { passwordActual, passwordNueva } = req.body;

      if (!passwordActual || !passwordNueva) {
        res.status(400).json({
          success: false,
          message: 'Contraseña actual y nueva son requeridas'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID de usuario es requerido'
        });
        return;
      }

      await this.updateUsuarioPasswordUseCase.execute(id as string, passwordActual, passwordNueva);

      res.json({
        success: true,
        message: 'Contraseña actualizada correctamente'
      });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al actualizar contraseña';
      
      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  async updateRol(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { rol } = req.body;
      const adminUser = req.user as AuthenticatedUser;

      if (!rol) {
        res.status(400).json({
          success: false,
          message: 'El rol es requerido'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID de usuario es requerido'
        });
        return;
      }

      const usuario = await this.updateUsuarioRolUseCase.execute(id as string, rol, adminUser.id);

      res.json({
        success: true,
        data: usuario
      });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al actualizar rol';
      
      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  async toggleActivo(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { activo } = req.body;
      const adminUser = req.user as AuthenticatedUser;

      if (typeof activo !== 'boolean') {
        res.status(400).json({
          success: false,
          message: 'El campo activo es requerido y debe ser booleano'
        });
        return;
      }

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID de usuario es requerido'
        });
        return;
      }

      const usuario = await this.toggleUsuarioActivoUseCase.execute(id as string, activo, adminUser.id);

      res.json({
        success: true,
        data: usuario
      });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al cambiar estado del usuario';
      
      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }
}
