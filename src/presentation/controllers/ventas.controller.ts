import { Request, Response } from 'express';
import { AuthenticatedUser } from '../middlewares/auth.middleware';
import { CreateVentaDirectaUseCase } from '../../application/use-cases/ventas/CreateVentaDirectaUseCase';
import { GetVentaProductosUseCase } from '../../application/use-cases/ventas/GetVentaProductosUseCase';
import { UpdateVentaProductoUseCase } from '../../application/use-cases/ventas/UpdateVentaProductoUseCase';
import { DeleteVentaProductoUseCase } from '../../application/use-cases/ventas/DeleteVentaProductoUseCase';
import { GetResumenVentasUseCase } from '../../application/use-cases/ventas/GetResumenVentasUseCase';
import { PostgresVentaProductoRepository } from '../../infrastructure/repositories/PostgresVentaProductoRepository';
import { PostgresUsuarioRepository } from '../../infrastructure/repositories/PostgresUsuarioRepository';
import { PostgresProductoRepository } from '../../infrastructure/repositories/PostgresProductoRepository';
import { MetodoPago } from '../../domain/entities/Turno';

export class VentasController {
  private createVentaUseCase: CreateVentaDirectaUseCase;
  private getVentasUseCase: GetVentaProductosUseCase;
  private updateVentaUseCase: UpdateVentaProductoUseCase;
  private deleteVentaUseCase: DeleteVentaProductoUseCase;
  private getResumenUseCase: GetResumenVentasUseCase;

  constructor() {
    const ventaProductoRepo = new PostgresVentaProductoRepository();

    this.createVentaUseCase = new CreateVentaDirectaUseCase(
      ventaProductoRepo,
      new PostgresUsuarioRepository(),
      new PostgresProductoRepository()
    );
    this.getVentasUseCase = new GetVentaProductosUseCase(ventaProductoRepo);
    this.updateVentaUseCase = new UpdateVentaProductoUseCase(ventaProductoRepo);
    this.deleteVentaUseCase = new DeleteVentaProductoUseCase(ventaProductoRepo);
    this.getResumenUseCase = new GetResumenVentasUseCase(ventaProductoRepo);
  }

  async getResumen(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const { fechaDesde, fechaHasta } = req.query as Record<string, string>;
      const data = await this.getResumenUseCase.execute(empresaId, fechaDesde, fechaHasta);
      res.status(200).json({ success: true, data });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, message: error.message || 'Error al obtener resumen' });
    }
  }

  async getVentas(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const {
        fechaDesde,
        fechaHasta,
        vendedor_id,
        page = '1',
        limit = '20',
      } = req.query as Record<string, string>;

      const result = await this.getVentasUseCase.execute(empresaId, {
        fechaDesde,
        fechaHasta,
        vendedor_id: vendedor_id || undefined,
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 20,
      });

      res.status(200).json({ success: true, data: result.rows, total: result.total });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, message: error.message || 'Error al obtener ventas' });
    }
  }

  async createVenta(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const { cliente_id, vendedor_id, metodo_pago, notas, items, fecha_venta } = req.body;

      if (!vendedor_id) {
        res.status(400).json({ success: false, message: 'vendedor_id es requerido' });
        return;
      }

      const itemsConFecha = Array.isArray(items)
        ? items.map((item: any) => ({
            ...item,
            fecha_venta: item.fecha_venta ?? fecha_venta ?? null,
          }))
        : items;

      const ventas = await this.createVentaUseCase.execute({
        empresa_id: empresaId,
        cliente_id: cliente_id || null,
        vendedor_id,
        metodo_pago: (metodo_pago || 'pendiente') as MetodoPago,
        notas,
        items: itemsConFecha,
      });

      res.status(201).json({ success: true, data: ventas });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, message: error.message || 'Error al registrar venta' });
    }
  }

  async updateVenta(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const { id } = req.params as Record<string, string>;

      if (!id) {
        res.status(400).json({ success: false, message: 'id es requerido' });
        return;
      }

      const {
        vendedor_id,
        nombre_producto,
        cantidad,
        precio_unitario,
        precio_total,
        metodo_pago,
        fecha_venta,
        es_venta_costo,
        costo_unitario_snapshot,
      } = req.body;

      const updated = await this.updateVentaUseCase.execute(id, empresaId, {
        vendedor_id,
        nombre_producto,
        cantidad,
        precio_unitario,
        precio_total,
        metodo_pago,
        fecha_venta,
        es_venta_costo,
        costo_unitario_snapshot,
      });

      res.status(200).json({ success: true, data: updated });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, message: error.message || 'Error al actualizar venta' });
    }
  }

  async deleteVenta(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const { id } = req.params as Record<string, string>;

      if (!id) {
        res.status(400).json({ success: false, message: 'id es requerido' });
        return;
      }

      await this.deleteVentaUseCase.execute(id, empresaId);
      res.status(200).json({ success: true, message: 'Venta eliminada correctamente' });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, message: error.message || 'Error al eliminar venta' });
    }
  }
}
