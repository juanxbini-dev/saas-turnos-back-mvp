import { IVentaProductoRepository, VentaProductoFiltros, VentaProductoConVendedor } from '../../../domain/repositories/IVentaProductoRepository';

export class GetVentaProductosUseCase {
  constructor(private repo: IVentaProductoRepository) {}

  async execute(empresaId: string, filtros: VentaProductoFiltros): Promise<{ rows: VentaProductoConVendedor[], total: number }> {
    if (!filtros.fechaDesde || !filtros.fechaHasta) {
      throw Object.assign(new Error('fechaDesde y fechaHasta son requeridos'), { statusCode: 400 });
    }
    return this.repo.findAllPaginated(empresaId, filtros);
  }
}
