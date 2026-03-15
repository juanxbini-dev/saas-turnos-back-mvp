import { IProductoRepository } from '../../../domain/repositories/IProductoRepository';
import { Producto } from '../../../domain/entities/Producto';

export class GetProductosUseCase {
  constructor(private productoRepository: IProductoRepository) {}

  async execute(empresaId: string): Promise<Producto[]> {
    return this.productoRepository.findAll(empresaId);
  }
}
