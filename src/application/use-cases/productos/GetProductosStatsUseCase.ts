import { IProductoRepository } from '../../../domain/repositories/IProductoRepository';
import { ProductosStats } from '../../../domain/entities/Producto';

export class GetProductosStatsUseCase {
  constructor(private productoRepository: IProductoRepository) {}

  async execute(empresaId: string): Promise<ProductosStats> {
    const [topProductos, topVendedores, bajoStock] = await Promise.all([
      this.productoRepository.getTopVendidos(empresaId, 10),
      this.productoRepository.getTopVendedores(empresaId, 5),
      this.productoRepository.findBajoStock(empresaId, 3),
    ]);

    return {
      top_productos: topProductos,
      top_vendedores: topVendedores,
      bajo_stock_count: bajoStock.length,
    };
  }
}
