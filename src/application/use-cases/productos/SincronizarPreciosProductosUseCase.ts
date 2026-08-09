import { IProductoRepository } from '../../../domain/repositories/IProductoRepository';

export interface SincronizarPreciosResult {
  actualizados: number;
  omitidos_sin_costo: number;
}

/**
 * Empareja todos los productos con la configuración general: borra los precios
 * manuales (quedan NULL = derivados de costo × pct). Los productos sin costo
 * no se tocan porque no tienen precio derivable.
 */
export class SincronizarPreciosProductosUseCase {
  constructor(private productoRepository: IProductoRepository) {}

  async execute(empresaId: string): Promise<SincronizarPreciosResult> {
    const [actualizados, omitidosSinCosto] = await Promise.all([
      this.productoRepository.resetPreciosManuales(empresaId),
      this.productoRepository.countManualesSinCosto(empresaId),
    ]);
    return { actualizados, omitidos_sin_costo: omitidosSinCosto };
  }
}
