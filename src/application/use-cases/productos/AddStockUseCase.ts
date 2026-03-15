import { IProductoRepository } from '../../../domain/repositories/IProductoRepository';
import { Producto } from '../../../domain/entities/Producto';

export class AddStockUseCase {
  constructor(private productoRepository: IProductoRepository) {}

  async execute(id: string, empresaId: string, cantidad: number): Promise<Producto> {
    const producto = await this.productoRepository.findById(id);
    if (!producto || producto.empresa_id !== empresaId) {
      throw Object.assign(new Error('Producto no encontrado'), { statusCode: 404 });
    }
    if (!Number.isInteger(cantidad) || cantidad <= 0) {
      throw Object.assign(new Error('La cantidad debe ser un entero positivo'), { statusCode: 400 });
    }
    return this.productoRepository.addStock(id, cantidad);
  }
}
