import { IVentaProductoRepository, UpdateVentaProductoData } from '../../../domain/repositories/IVentaProductoRepository';
import { VentaProducto } from '../../../domain/entities/Comision';

export class UpdateVentaProductoUseCase {
  constructor(private repo: IVentaProductoRepository) {}

  async execute(id: string, empresaId: string, data: UpdateVentaProductoData): Promise<VentaProducto> {
    // Canje = entrega gratis: al pasar a canje se fuerzan todos los importes en 0.
    // (El cambio DE canje a otro método es pass-through: el precio lo manda el frontend.)
    const dataFinal: UpdateVentaProductoData = data.metodo_pago === 'canje'
      ? { ...data, precio_unitario: 0, precio_total: 0, comision_monto: 0, neto_vendedor: 0 }
      : data;
    const updated = await this.repo.updateById(id, empresaId, dataFinal);
    if (!updated) throw Object.assign(new Error('Venta no encontrada'), { statusCode: 404 });
    return updated;
  }
}
