import { Request, Response } from 'express';
import { GetUsuariosUseCase } from '../../application/use-cases/usuarios/GetUsuariosUseCase';
import { CreateUsuarioUseCase } from '../../application/use-cases/usuarios/CreateUsuarioUseCase';
import { UpdateUsuarioDatosUseCase } from '../../application/use-cases/usuarios/UpdateUsuarioDatosUseCase';
import { UpdateUsuarioPasswordUseCase } from '../../application/use-cases/usuarios/UpdateUsuarioPasswordUseCase';
import { UpdateUsuarioRolUseCase } from '../../application/use-cases/usuarios/UpdateUsuarioRolUseCase';
import { DeleteUsuarioUseCase } from '../../application/use-cases/usuarios/DeleteUsuarioUseCase';
import { GetProfesionalesUseCase } from '../../application/use-cases/usuarios/GetProfesionalesUseCase';
import { UpdateUsuarioAvatarUseCase } from '../../application/use-cases/usuarios/UpdateUsuarioAvatarUseCase';
import { DeleteUsuarioAvatarUseCase } from '../../application/use-cases/usuarios/DeleteUsuarioAvatarUseCase';
import { PostgresUsuarioRepository } from '../../infrastructure/repositories/PostgresUsuarioRepository';
import { PostgresUsuarioServicioRepository } from '../../infrastructure/repositories/PostgresUsuarioServicioRepository';
import { CloudinaryImageRepository } from '../../infrastructure/repositories/CloudinaryImageRepository';
import { PasswordService } from '../../infrastructure/security/password.service';
import { CryptoService } from '../../infrastructure/security/crypto.service';
import { AuthenticatedUser } from '../middlewares/auth.middleware';

export class UsuariosController {
  private getUsuariosUseCase: GetUsuariosUseCase;
  private createUsuarioUseCase: CreateUsuarioUseCase;
  private updateUsuarioDatosUseCase: UpdateUsuarioDatosUseCase;
  private updateUsuarioPasswordUseCase: UpdateUsuarioPasswordUseCase;
  private updateUsuarioRolUseCase: UpdateUsuarioRolUseCase;
  private deleteUsuarioUseCase: DeleteUsuarioUseCase;
  private getProfesionalesUseCase: GetProfesionalesUseCase;
  private updateUsuarioAvatarUseCase: UpdateUsuarioAvatarUseCase;
  private deleteUsuarioAvatarUseCase: DeleteUsuarioAvatarUseCase;
  private usuarioServicioRepository: PostgresUsuarioServicioRepository;

  constructor() {
    const usuarioRepository = new PostgresUsuarioRepository();
    const imageRepository = new CloudinaryImageRepository();
    this.usuarioServicioRepository = new PostgresUsuarioServicioRepository();
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
    this.deleteUsuarioUseCase = new DeleteUsuarioUseCase(usuarioRepository, imageRepository);
    this.getProfesionalesUseCase = new GetProfesionalesUseCase(usuarioRepository);
    this.updateUsuarioAvatarUseCase = new UpdateUsuarioAvatarUseCase(imageRepository, usuarioRepository);
    this.deleteUsuarioAvatarUseCase = new DeleteUsuarioAvatarUseCase(imageRepository, usuarioRepository);
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
      const { nombre, username, password, email, rol, telefono } = req.body;

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
        rol,
        telefono: telefono || null
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
      const { nombre, username, email, comision_turno, comision_producto, telefono } = req.body;

      if (!nombre || !username || !email) {
        res.status(400).json({
          success: false,
          message: 'Nombre, username y email son requeridos'
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

      const usuario = await this.updateUsuarioDatosUseCase.execute(id as string, {
        nombre,
        username,
        email,
        comision_turno,
        comision_producto,
        telefono: telefono || null
      });

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

  async uploadAvatar(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = req.user as AuthenticatedUser;

      if (!req.file) {
        res.status(400).json({
          success: false,
          message: 'No se envió ninguna imagen'
        });
        return;
      }

      const usuario = await this.updateUsuarioAvatarUseCase.execute(id as string, adminUser.empresaId, req.file.buffer);

      res.json({
        success: true,
        data: usuario
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
      const { id } = req.params;
      const adminUser = req.user as AuthenticatedUser;

      const usuario = await this.deleteUsuarioAvatarUseCase.execute(id as string, adminUser.empresaId);

      res.json({
        success: true,
        data: usuario
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

  async deleteUsuario(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const adminUser = req.user as AuthenticatedUser;

      await this.deleteUsuarioUseCase.execute(id as string, adminUser.id, adminUser.empresaId);

      res.json({
        success: true,
        message: 'Usuario eliminado correctamente'
      });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al eliminar el usuario';

      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  async getProfesionales(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      const { page, limit, search } = req.query;

      const params: {
        page?: number;
        limit?: number;
        search?: string;
      } = {};

      if (page !== undefined) {
        params.page = parseInt(page as string);
      }
      if (limit !== undefined) {
        params.limit = parseInt(limit as string);
      }
      if (search !== undefined) {
        params.search = search as string;
      }

      const result = await this.getProfesionalesUseCase.execute(user.empresaId, params);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al obtener profesionales';
      
      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  async getServiciosProfesional(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID de profesional es requerido'
        });
        return;
      }

      console.log('🔍 [UsuariosController] Obteniendo servicios para profesional ID:', id);
      const servicios = await this.usuarioServicioRepository.findByUsuario(id as string);
      console.log('🔍 [UsuariosController] Servicios encontrados:', servicios);

      res.json({
        success: true,
        data: servicios
      });
    } catch (error) {
      console.error('💥 [UsuariosController] Error al obtener servicios del profesional:', error);
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al obtener servicios del profesional';
      
      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }
}
