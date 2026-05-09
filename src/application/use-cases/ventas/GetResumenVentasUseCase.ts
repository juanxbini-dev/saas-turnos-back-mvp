import { IVentaProductoRepository, ResumenTotalesVentas, ResumenProfesional, ResumenProducto } from '../../../domain/repositories/IVentaProductoRepository';

export class GetResumenVentasUseCase {
  constructor(private repo: IVentaProductoRepository) {}

  async execute(
    empresaId: string,
    fechaDesde: string,
    fechaHasta: string,
    vendedorId?: string
  ): Promise<{ totales: ResumenTotalesVentas; por_profesional: ResumenProfesional[]; por_producto: ResumenProducto[] }> {
    if (!fechaDesde || !fechaHasta) {
      throw Object.assign(new Error('fechaDesde y fechaHasta son requeridos'), { statusCode: 400 });
    }
    return this.repo.getResumen(empresaId, fechaDesde, fechaHasta, vendedorId);
  }
}
