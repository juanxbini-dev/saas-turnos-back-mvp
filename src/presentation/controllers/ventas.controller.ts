import { Request, Response } from 'express';
import { AuthenticatedUser } from '../middlewares/auth.middleware';
import { CreateVentaDirectaUseCase } from '../../application/use-cases/ventas/CreateVentaDirectaUseCase';
import { PostgresVentaRepository } from '../../infrastructure/repositories/PostgresVentaRepository';
import { MetodoPago } from '../../domain/entities/Turno';

export class VentasController {
  private createVentaUseCase: CreateVentaDirectaUseCase;

  constructor() {
    this.createVentaUseCase = new CreateVentaDirectaUseCase(new PostgresVentaRepository());
  }

  async createVenta(req: Request, res: Response): Promise<void> {
    try {
      const { empresaId } = req.user as AuthenticatedUser;
      const { cliente_id, vendedor_id, metodo_pago, notas, items } = req.body;

      if (!vendedor_id) {
        res.status(400).json({ success: false, message: 'vendedor_id es requerido' });
        return;
      }

      const venta = await this.createVentaUseCase.execute({
        empresa_id: empresaId,
        cliente_id: cliente_id || null,
        vendedor_id,
        metodo_pago: (metodo_pago || 'pendiente') as MetodoPago,
        notas,
        items,
      });

      res.status(201).json({ success: true, data: venta });
    } catch (error: any) {
      const status = error.statusCode || 500;
      res.status(status).json({ success: false, message: error.message || 'Error al registrar venta' });
    }
  }
}
