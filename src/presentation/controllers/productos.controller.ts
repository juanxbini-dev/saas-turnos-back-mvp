import { Request, Response } from 'express';
import { AuthenticatedUser } from '../middlewares/auth.middleware';
import { GetProductosUseCase } from '../../application/use-cases/productos/GetProductosUseCase';
import { CreateProductoUseCase } from '../../application/use-cases/productos/CreateProductoUseCase';
import { UpdateProductoUseCase } from '../../application/use-cases/productos/UpdateProductoUseCase';
import { AddStockUseCase } from '../../application/use-cases/productos/AddStockUseCase';
import { DeleteProductoUseCase } from '../../application/use-cases/productos/DeleteProductoUseCase';
import { GetProductosStatsUseCase } from '../../application/use-cases/productos/GetProductosStatsUseCase';
import { GetConfiguracionProductosUseCase } from '../../application/use-cases/productos/GetConfiguracionProductosUseCase';
import { UpdateConfiguracionProductosUseCase } from '../../application/use-cases/productos/UpdateConfiguracionProductosUseCase';
import { PostgresProductoRepository } from '../../infrastructure/repositories/PostgresProductoRepository';
import { PostgresConfiguracionProductosRepository } from '../../infrastructure/repositories/PostgresConfiguracionProductosRepository';

export class ProductosController {
  private getProductosUseCase: GetProductosUseCase;
  private createProductoUseCase: CreateProductoUseCase;
  private updateProductoUseCase: UpdateProductoUseCase;
  private addStockUseCase: AddStockUseCase;
  private getStatsUseCase: GetProductosStatsUseCase;
  private deleteProductoUseCase: DeleteProductoUseCase;
  private getConfiguracionUseCase: GetConfiguracionProductosUseCase;
  private updateConfiguracionUseCase: UpdateConfiguracionProductosUseCase;

  constructor() {
    const repo = new PostgresProductoRepository();
    const configRepo = new PostgresConfiguracionProductosRepository();
    this.getProductosUseCase = new GetProductosUseCase(repo, configRepo);
    this.createProductoUseCase = new CreateProductoUseCase(repo, configRepo);
    this.updateProductoUseCase = new UpdateProductoUseCase(repo, configRepo);
    this.addStockUseCase = new AddStockUseCase(repo);
    this.deleteProductoUseCase = new DeleteProductoUseCase(repo);
    this.getStatsUseCase = new GetProductosStatsUseCase(repo);
    this.getConfiguracionUseCase = new GetConfiguracionProductosUseCase(configRepo);
    this.updateConfiguracionUseCase = new UpdateConfiguracionProductosUseCase(configRepo);
  }

  async getProductos(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const productos = await this.getProductosUseCase.execute(empresaId);
      res.json({ success: true, data: productos });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener productos' });
    }
  }

  async createProducto(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const { nombre, descripcion, precio_efectivo, precio_transferencia, precio_tarjeta, costo, stock, marca_id } = req.body;
      const producto = await this.createProductoUseCase.execute(empresaId, {
        nombre,
        descripcion,
        // null/vacío = precio derivado de la configuración general
        precio_efectivo: precio_efectivo != null && precio_efectivo !== '' ? Number(precio_efectivo) : null,
        precio_transferencia: precio_transferencia != null && precio_transferencia !== '' ? Number(precio_transferencia) : null,
        precio_tarjeta: precio_tarjeta != null && precio_tarjeta !== '' ? Number(precio_tarjeta) : null,
        costo: Number(costo),
        stock: Number(stock),
        marca_id: marca_id || null,
      });
      res.status(201).json({ success: true, data: producto });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, message: error.message || 'Error al crear producto' });
    }
  }

  async updateProducto(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const id = req.params.id as string;
      const { nombre, descripcion, precio_efectivo, precio_transferencia, precio_tarjeta, costo, stock, activo, marca_id } = req.body;
      const updateData: import('../../domain/entities/Producto').UpdateProductoData = {};
      if (nombre !== undefined) updateData.nombre = nombre;
      if (descripcion !== undefined) updateData.descripcion = descripcion;
      // null/vacío explícito = volver al precio derivado de la configuración
      if (precio_efectivo !== undefined) updateData.precio_efectivo = precio_efectivo != null && precio_efectivo !== '' ? Number(precio_efectivo) : null;
      if (precio_transferencia !== undefined) updateData.precio_transferencia = precio_transferencia != null && precio_transferencia !== '' ? Number(precio_transferencia) : null;
      if (precio_tarjeta !== undefined) updateData.precio_tarjeta = precio_tarjeta != null && precio_tarjeta !== '' ? Number(precio_tarjeta) : null;
      if (costo !== undefined) updateData.costo = Number(costo);
      if (stock !== undefined) updateData.stock = Number(stock);
      if (activo !== undefined) updateData.activo = activo;
      if (marca_id !== undefined) updateData.marca_id = marca_id || null;
      const producto = await this.updateProductoUseCase.execute(id, empresaId, updateData);
      res.json({ success: true, data: producto });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, message: error.message || 'Error al actualizar producto' });
    }
  }

  async addStock(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const id = req.params.id as string;
      const { cantidad } = req.body;
      const producto = await this.addStockUseCase.execute(id, empresaId, Number(cantidad));
      res.json({ success: true, data: producto });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, message: error.message || 'Error al agregar stock' });
    }
  }

  async deleteProducto(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const id = req.params.id as string;
      await this.deleteProductoUseCase.execute(id, empresaId);
      res.json({ success: true });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, message: error.message || 'Error al eliminar producto' });
    }
  }

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const stats = await this.getStatsUseCase.execute(empresaId);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
  }

  async getConfiguracion(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const config = await this.getConfiguracionUseCase.execute(empresaId);
      res.json({ success: true, data: config });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener la configuración de productos' });
    }
  }

  async updateConfiguracion(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const { pct_efectivo, pct_transferencia, pct_tarjeta } = req.body;
      const config = await this.updateConfiguracionUseCase.execute(empresaId, {
        pct_efectivo,
        pct_transferencia,
        pct_tarjeta,
      });
      res.json({ success: true, data: config });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, message: error.message || 'Error al actualizar la configuración de productos' });
    }
  }

  async getVentasFinanzas(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const { fecha_desde, fecha_hasta } = req.query as { fecha_desde?: string; fecha_hasta?: string };
      const repo = new PostgresProductoRepository();
      const data = await repo.getVentasFinanzas(empresaId, fecha_desde, fecha_hasta);
      res.json({ success: true, data });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener finanzas de productos' });
    }
  }
}
