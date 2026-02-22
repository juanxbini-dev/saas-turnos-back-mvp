import { Request, Response } from 'express';
import { GetClientesUseCase } from '../../application/use-cases/clientes/GetClientesUseCase';
import { CreateClienteUseCase } from '../../application/use-cases/clientes/CreateClienteUseCase';
import { UpdateClienteUseCase } from '../../application/use-cases/clientes/UpdateClienteUseCase';
import { ToggleClienteActivoUseCase } from '../../application/use-cases/clientes/ToggleClienteActivoUseCase';
import { PostgresClienteRepository } from '../../infrastructure/repositories/PostgresClienteRepository';
import { CryptoService } from '../../infrastructure/security/crypto.service';
import { AuthenticatedUser } from '../middlewares/auth.middleware';

export class ClientesController {
  private getClientesUseCase: GetClientesUseCase;
  private createClienteUseCase: CreateClienteUseCase;
  private updateClienteUseCase: UpdateClienteUseCase;
  private toggleClienteActivoUseCase: ToggleClienteActivoUseCase;

  constructor() {
    const clienteRepository = new PostgresClienteRepository();
    const cryptoService = new CryptoService();

    this.getClientesUseCase = new GetClientesUseCase(clienteRepository);
    this.createClienteUseCase = new CreateClienteUseCase(clienteRepository, cryptoService);
    this.updateClienteUseCase = new UpdateClienteUseCase(clienteRepository);
    this.toggleClienteActivoUseCase = new ToggleClienteActivoUseCase(clienteRepository);
  }

  async getClientes(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      const clientes = await this.getClientesUseCase.execute(user.empresaId);
      
      res.json({
        success: true,
        data: clientes
      });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al obtener clientes';
      
      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  async createCliente(req: Request, res: Response): Promise<void> {
    try {
      console.log('🔍 [ClientesController] createCliente - Petición recibida');
      console.log('🔍 [ClientesController] Body:', req.body);
      console.log('🔍 [ClientesController] User:', req.user);
      
      const user = req.user as AuthenticatedUser;
      
      // Verificar si es admin
      if (!user.roles.includes('admin')) {
        console.error('💥 [ClientesController] Usuario no es admin - roles:', user.roles);
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para crear clientes'
        });
        return;
      }

      const { nombre, email, telefono } = req.body;
      console.log('🔍 [ClientesController] Datos extraídos:', { nombre, email, telefono });

      if (!nombre || !email) {
        console.error('💥 [ClientesController] Datos faltantes - nombre:', nombre, 'email:', email);
        res.status(400).json({
          success: false,
          message: 'Nombre y email son requeridos'
        });
        return;
      }

      console.log('🔍 [ClientesController] Llamando a CreateClienteUseCase...');
      const cliente = await this.createClienteUseCase.execute(
        nombre,
        email,
        telefono,
        user.empresaId
      );
      console.log('🔍 [ClientesController] Cliente creado:', cliente);

      res.status(201).json({
        success: true,
        data: cliente
      });
    } catch (error) {
      console.error('💥 [ClientesController] Error en createCliente:', error);
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al crear cliente';
      
      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  async updateCliente(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { nombre, email, telefono } = req.body;
      const user = req.user as AuthenticatedUser;

      if (!id) {
        res.status(400).json({
          success: false,
          message: 'ID de cliente es requerido'
        });
        return;
      }

      // Admin y staff pueden editar
      if (!user.roles.includes('admin') && !user.roles.includes('staff')) {
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para editar clientes'
        });
        return;
      }

      const updateData: any = {};
      if (nombre !== undefined) updateData.nombre = nombre;
      if (email !== undefined) updateData.email = email;
      if (telefono !== undefined) updateData.telefono = telefono;

      const cliente = await this.updateClienteUseCase.execute(
        id as string,
        updateData,
        user.empresaId
      );

      res.json({
        success: true,
        data: cliente
      });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al actualizar cliente';
      
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
      const user = req.user as AuthenticatedUser;

      // Solo admin puede activar/desactivar
      if (!user.roles.includes('admin')) {
        res.status(403).json({
          success: false,
          message: 'No tienes permisos para activar/desactivar clientes'
        });
        return;
      }

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
          message: 'ID de cliente es requerido'
        });
        return;
      }

      const cliente = await this.toggleClienteActivoUseCase.execute(id as string, activo);

      res.json({
        success: true,
        data: cliente
      });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al cambiar estado del cliente';
      
      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }
}
