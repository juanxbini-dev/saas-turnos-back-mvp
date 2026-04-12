import { Request, Response } from 'express';
import { GetClientesUseCase } from '../../application/use-cases/clientes/GetClientesUseCase';
import { GetMisClientesUseCase } from '../../application/use-cases/clientes/GetMisClientesUseCase';
import { CreateClienteUseCase } from '../../application/use-cases/clientes/CreateClienteUseCase';
import { UpdateClienteUseCase } from '../../application/use-cases/clientes/UpdateClienteUseCase';
import { DeleteClienteUseCase } from '../../application/use-cases/clientes/DeleteClienteUseCase';
import { GetClientePerfilUseCase } from '../../application/use-cases/clientes/GetClientePerfilUseCase';
import { PostgresClienteRepository } from '../../infrastructure/repositories/PostgresClienteRepository';
import { CryptoService } from '../../infrastructure/security/crypto.service';
import { AuthenticatedUser } from '../middlewares/auth.middleware';

export class ClientesController {
  private getClientesUseCase: GetClientesUseCase;
  private getMisClientesUseCase: GetMisClientesUseCase;
  private createClienteUseCase: CreateClienteUseCase;
  private updateClienteUseCase: UpdateClienteUseCase;
  private deleteClienteUseCase: DeleteClienteUseCase;
  private getClientePerfilUseCase: GetClientePerfilUseCase;

  constructor() {
    const clienteRepository = new PostgresClienteRepository();
    const cryptoService = new CryptoService();

    this.getClientesUseCase = new GetClientesUseCase(clienteRepository);
    this.getMisClientesUseCase = new GetMisClientesUseCase(clienteRepository);
    this.createClienteUseCase = new CreateClienteUseCase(clienteRepository, cryptoService);
    this.updateClienteUseCase = new UpdateClienteUseCase(clienteRepository);
    this.deleteClienteUseCase = new DeleteClienteUseCase(clienteRepository);
    this.getClientePerfilUseCase = new GetClientePerfilUseCase(clienteRepository);
  }

  async getClientes(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      const pagina = Math.max(1, parseInt(req.query.pagina as string) || 1);
      const porPagina = Math.min(100, Math.max(1, parseInt(req.query.por_pagina as string) || 20));
      const busqueda = (req.query.busqueda as string)?.trim() || undefined;

      const { items, total } = await this.getClientesUseCase.execute(user.empresaId, pagina, porPagina, busqueda);
      const totalPaginas = Math.ceil(total / porPagina);

      res.json({
        success: true,
        data: items,
        meta: { total, pagina, por_pagina: porPagina, total_paginas: totalPaginas }
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
      
      // Verificar si es admin o staff (ambos pueden crear clientes)
      if (!user.roles.includes('admin') && !user.roles.includes('staff')) {
        console.error('💥 [ClientesController] Usuario no tiene permisos - roles:', user.roles);
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

  async deleteCliente(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user as AuthenticatedUser;

      if (!user.roles.includes('admin')) {
        res.status(403).json({
          success: false,
          message: 'No tenés permisos para eliminar clientes'
        });
        return;
      }

      await this.deleteClienteUseCase.execute(id as string, user.empresaId);

      res.json({
        success: true,
        message: 'Cliente eliminado correctamente'
      });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al eliminar el cliente';

      res.status(statusCode).json({
        success: false,
        message
      });
    }
  }

  async getPerfilCliente(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const user = req.user as AuthenticatedUser;

      const perfil = await this.getClientePerfilUseCase.execute(id as string, user.empresaId);

      res.json({ success: true, data: perfil });
    } catch (error) {
      const statusCode = (error as any).statusCode || 500;
      const message = error instanceof Error ? error.message : 'Error al obtener perfil del cliente';
      res.status(statusCode).json({ success: false, message });
    }
  }

  async getMisClientes(req: Request, res: Response): Promise<void> {
    try {
      const user = req.user as AuthenticatedUser;
      const isSuperAdmin = user.roles.includes('super_admin');
      const efectivoUsuarioId = isSuperAdmin && req.query.usuarioId
        ? req.query.usuarioId as string
        : user.id;

      console.log('🔍 [ClientesController] getMisClientes - Petición recibida');
      console.log('🔍 [ClientesController] User:', user);

      const clientes = await this.getMisClientesUseCase.execute({
        usuarioId: efectivoUsuarioId,
        empresaId: user.empresaId
      });

      res.json({
        success: true,
        data: clientes
      });
    } catch (error) {
      console.error('❌ [ClientesController] Error en getMisClientes:', error);
      
      res.status(500).json({
        success: false,
        message: 'Error al obtener mis clientes'
      });
    }
  }
}
