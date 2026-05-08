import { IVentaProductoRepository, UpdateVentaProductoData } from '../../../domain/repositories/IVentaProductoRepository';
import { VentaProducto } from '../../../domain/entities/Comision';

export class UpdateVentaProductoUseCase {
  constructor(private repo: IVentaProductoRepository) {}

  async execute(id: string, empresaId: string, data: UpdateVentaProductoData): Promise<VentaProducto> {
    const updated = await this.repo.updateById(id, empresaId, data);
    if (!updated) throw Object.assign(new Error('Venta no encontrada'), { statusCode: 404 });
    return updated;
  }
}
