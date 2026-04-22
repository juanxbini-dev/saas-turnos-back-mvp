import { Request, Response } from 'express';
import { GetServiciosUseCase } from '../../application/use-cases/servicios/GetServiciosUseCase';
import { CreateServicioUseCase } from '../../application/use-cases/servicios/CreateServicioUseCase';
import { UpdateServicioUseCase } from '../../application/use-cases/servicios/UpdateServicioUseCase';
import { ToggleServicioActivoUseCase } from '../../application/use-cases/servicios/ToggleServicioActivoUseCase';
import { DeleteServicioUseCase } from '../../application/use-cases/servicios/DeleteServicioUseCase';
import { SuscribirseServicioUseCase } from '../../application/use-cases/servicios/SuscribirseServicioUseCase';
import { GetMisServiciosUseCase } from '../../application/use-cases/servicios/GetMisServiciosUseCase';
import { UpdateMiServicioUseCase } from '../../application/use-cases/servicios/UpdateMiServicioUseCase';
import { DesuscribirseServicioUseCase } from '../../application/use-cases/servicios/DesuscribirseServicioUseCase';
import { PostgresServicioRepository } from '../../infrastructure/repositories/PostgresServicioRepository';
import { PostgresUsuarioServicioRepository } from '../../infrastructure/repositories/PostgresUsuarioServicioRepository';
import { CryptoService } from '../../infrastructure/security/crypto.service';
import { AuthenticatedUser } from '../middlewares/auth.middleware';

export class ServiciosController {
  private getServiciosUseCase: GetServiciosUseCase;
  private createServicioUseCase: CreateServicioUseCase;
  private updateServicioUseCase: UpdateServicioUseCase;
  private toggleServicioActivoUseCase: ToggleServicioActivoUseCase;
  private deleteServicioUseCase: DeleteServicioUseCase;
  private suscribirseServicioUseCase: SuscribirseServicioUseCase;
  private getMisServiciosUseCase: GetMisServiciosUseCase;
  private updateMiServicioUseCase: UpdateMiServicioUseCase;
  private desuscribirseServicioUseCase: DesuscribirseServicioUseCase;

  constructor() {
    const servicioRepository = new PostgresServicioRepository();
    const usuarioServicioRepository = new PostgresUsuarioServicioRepository();
    const cryptoService = new CryptoService();

    this.getServiciosUseCase = new GetServiciosUseCase(servicioRepository);
    this.createServicioUseCase = new CreateServicioUseCase(servicioRepository, cryptoService);
    this.updateServicioUseCase = new UpdateServicioUseCase(servicioRepository);
    this.toggleServicioActivoUseCase = new ToggleServicioActivoUseCase(servicioRepository);
    this.deleteServicioUseCase = new DeleteServicioUseCase(servicioRepository);
    this.suscribirseServicioUseCase = new SuscribirseServicioUseCase(usuarioServicioRepository, cryptoService);
    this.getMisServiciosUseCase = new GetMisServiciosUseCase(usuarioServicioRepository);
    this.updateMiServicioUseCase = new UpdateMiServicioUseCase(usuarioServicioRepository);
    this.desuscribirseServicioUseCase = new DesuscribirseServicioUseCase(usuarioServicioRepository);
  }

  async getServicios(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      const servicios = await this.getServiciosUseCase.execute(user.empresaId);
      
      res.json({
        success: true,
        data: servicios
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error al obtener los servicios'
      });
    }
  }

  async createServicio(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      
      if (!user.roles.includes('admin')) {
        throw Object.assign(new Error('No tienes permisos para crear servicios'), { statusCode: 403 });
      }

      const servicio = await this.createServicioUseCase.execute({
        ...req.body,
        empresa_id: user.empresaId
      });
      
      res.status(201).json({
        success: true,
        data: servicio
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error al crear el servicio'
      });
    }
  }

  async updateServicio(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      
      if (!user.roles.includes('admin')) {
        throw Object.assign(new Error('No tienes permisos para editar servicios'), { statusCode: 403 });
      }

      const { id } = req.params;
      if (!id) {
        throw Object.assign(new Error('ID de servicio requerido'), { statusCode: 400 });
      }
      const servicio = await this.updateServicioUseCase.execute(id as string, req.body);
      
      res.json({
        success: true,
        data: servicio
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error al actualizar el servicio'
      });
    }
  }

  async toggleActivo(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      
      if (!user.roles.includes('admin')) {
        throw Object.assign(new Error('No tienes permisos para cambiar el estado de los servicios'), { statusCode: 403 });
      }

      const { id } = req.params;
      if (!id) {
        throw Object.assign(new Error('ID de servicio requerido'), { statusCode: 400 });
      }
      const { activo } = req.body;
      const servicio = await this.toggleServicioActivoUseCase.execute(id as string, activo);
      
      res.json({
        success: true,
        data: servicio
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error al cambiar el estado del servicio'
      });
    }
  }

  async deleteServicio(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      
      if (!user.roles.includes('admin')) {
        throw Object.assign(new Error('No tienes permisos para eliminar servicios'), { statusCode: 403 });
      }

      const { id } = req.params;
      if (!id) {
        throw Object.assign(new Error('ID de servicio requerido'), { statusCode: 400 });
      }
      await this.deleteServicioUseCase.execute(id as string);
      
      res.json({
        success: true,
        message: 'Servicio eliminado correctamente'
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error al eliminar el servicio'
      });
    }
  }

  async suscribirse(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      const { id: servicioId } = req.params;
      if (!servicioId) {
        throw Object.assign(new Error('ID de servicio requerido'), { statusCode: 400 });
      }
      const isSuperAdmin = user.roles.includes('super_admin');
      const efectivoUsuarioId = isSuperAdmin && req.body.usuario_id ? req.body.usuario_id : user.id;

      const usuarioServicio = await this.suscribirseServicioUseCase.execute(
        efectivoUsuarioId,
        servicioId as string,
        user.empresaId
      );
      
      res.status(201).json({
        success: true,
        data: usuarioServicio
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error al suscribirse al servicio'
      });
    }
  }

  async desuscribirse(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      const { id: servicioId } = req.params;
      if (!servicioId) {
        throw Object.assign(new Error('ID de servicio requerido'), { statusCode: 400 });
      }
      const isSuperAdmin = user.roles.includes('super_admin');
      const efectivoUsuarioId = isSuperAdmin && req.body.usuario_id ? req.body.usuario_id : user.id;

      const usuarioServicioRepository = new PostgresUsuarioServicioRepository();
      const usuarioServicios = await usuarioServicioRepository.findByUsuario(efectivoUsuarioId);
      const miServicio = usuarioServicios.find(us => us.servicio_id === servicioId);

      if (!miServicio) {
        throw Object.assign(new Error('El usuario no está suscripto a este servicio'), { statusCode: 404 });
      }

      await this.desuscribirseServicioUseCase.execute(miServicio.id, efectivoUsuarioId);
      
      res.json({
        success: true,
        message: 'Suscripción eliminada correctamente'
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error al eliminar la suscripción'
      });
    }
  }

  async getMisServicios(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      const isPrivileged = user.roles.includes('super_admin') || user.roles.includes('admin');
      const efectivoUsuarioId = isPrivileged && req.query.usuarioId
        ? req.query.usuarioId as string
        : user.id;
      const misServicios = await this.getMisServiciosUseCase.execute(efectivoUsuarioId);
      
      res.json({
        success: true,
        data: misServicios
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error al obtener tus servicios'
      });
    }
  }

  async updateMiServicio(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      const { id } = req.params;
      if (!id) {
        throw Object.assign(new Error('ID de servicio requerido'), { statusCode: 400 });
      }
      
      const miServicio = await this.updateMiServicioUseCase.execute(id as string, user.id, req.body);
      
      res.json({
        success: true,
        data: miServicio
      });
    } catch (error: any) {
      const statusCode = error.statusCode || 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || 'Error al actualizar tu servicio'
      });
    }
  }
}
