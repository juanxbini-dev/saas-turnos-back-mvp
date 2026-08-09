import { IProductoRepository } from '../../../domain/repositories/IProductoRepository';
import { IConfiguracionProductosRepository } from '../../../domain/repositories/IConfiguracionProductosRepository';
import { Producto } from '../../../domain/entities/Producto';
import { CONFIGURACION_PRODUCTOS_DEFAULT } from '../../../domain/entities/ConfiguracionProductos';
import { aplicarPreciosDerivados } from '../../../shared/utils/precios.utils';

export class GetProductosUseCase {
  constructor(
    private productoRepository: IProductoRepository,
    private configRepository: IConfiguracionProductosRepository
  ) {}

  async execute(empresaId: string): Promise<Producto[]> {
    const [productos, config] = await Promise.all([
      this.productoRepository.findAll(empresaId),
      this.configRepository.findByEmpresa(empresaId),
    ]);
    const configEfectiva = config ?? { empresa_id: empresaId, ...CONFIGURACION_PRODUCTOS_DEFAULT };
    return productos.map((p) => aplicarPreciosDerivados(p, configEfectiva));
  }
}
