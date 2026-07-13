import { IProductoRepository } from '../../../domain/repositories/IProductoRepository';
import { IConfiguracionProductosRepository } from '../../../domain/repositories/IConfiguracionProductosRepository';
import { ProductosStats } from '../../../domain/entities/Producto';
import { CONFIGURACION_PRODUCTOS_DEFAULT } from '../../../domain/entities/ConfiguracionProductos';

export class GetProductosStatsUseCase {
  constructor(
    private productoRepository: IProductoRepository,
    private configRepository?: IConfiguracionProductosRepository
  ) {}

  async execute(empresaId: string): Promise<ProductosStats> {
    const config = await this.configRepository?.findByEmpresa(empresaId);
    const umbral = config?.stock_minimo ?? CONFIGURACION_PRODUCTOS_DEFAULT.stock_minimo;
    const [topProductos, topVendedores, bajoStock] = await Promise.all([
      this.productoRepository.getTopVendidos(empresaId, 10),
      this.productoRepository.getTopVendedores(empresaId, 5),
      this.productoRepository.findBajoStock(empresaId, umbral),
    ]);

    return {
      top_productos: topProductos,
      top_vendedores: topVendedores,
      bajo_stock_count: bajoStock.length,
    };
  }
}
