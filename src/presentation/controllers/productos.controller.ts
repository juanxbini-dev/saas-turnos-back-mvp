import { Request, Response } from 'express';
import { AuthenticatedUser } from '../middlewares/auth.middleware';
import { GetProductosUseCase } from '../../application/use-cases/productos/GetProductosUseCase';
import { CreateProductoUseCase } from '../../application/use-cases/productos/CreateProductoUseCase';
import { UpdateProductoUseCase } from '../../application/use-cases/productos/UpdateProductoUseCase';
import { AddStockUseCase } from '../../application/use-cases/productos/AddStockUseCase';
import { GetProductosStatsUseCase } from '../../application/use-cases/productos/GetProductosStatsUseCase';
import { PostgresProductoRepository } from '../../infrastructure/repositories/PostgresProductoRepository';

export class ProductosController {
  private getProductosUseCase: GetProductosUseCase;
  private createProductoUseCase: CreateProductoUseCase;
  private updateProductoUseCase: UpdateProductoUseCase;
  private addStockUseCase: AddStockUseCase;
  private getStatsUseCase: GetProductosStatsUseCase;

  constructor() {
    const repo = new PostgresProductoRepository();
    this.getProductosUseCase = new GetProductosUseCase(repo);
    this.createProductoUseCase = new CreateProductoUseCase(repo);
    this.updateProductoUseCase = new UpdateProductoUseCase(repo);
    this.addStockUseCase = new AddStockUseCase(repo);
    this.getStatsUseCase = new GetProductosStatsUseCase(repo);
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
      const { nombre, descripcion, precio, stock } = req.body;
      const producto = await this.createProductoUseCase.execute(empresaId, { nombre, descripcion, precio: Number(precio), stock: Number(stock) });
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
      const { nombre, descripcion, precio, activo } = req.body;
      const updateData: import('../../domain/entities/Producto').UpdateProductoData = {};
      if (nombre !== undefined) updateData.nombre = nombre;
      if (descripcion !== undefined) updateData.descripcion = descripcion;
      if (precio !== undefined) updateData.precio = Number(precio);
      if (activo !== undefined) updateData.activo = activo;
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

  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const stats = await this.getStatsUseCase.execute(empresaId);
      res.json({ success: true, data: stats });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener estadísticas' });
    }
  }
}
