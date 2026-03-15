import { IProductoRepository } from '../../../domain/repositories/IProductoRepository';
import { Producto, CreateProductoData } from '../../../domain/entities/Producto';

export class CreateProductoUseCase {
  constructor(private productoRepository: IProductoRepository) {}

  async execute(empresaId: string, data: Omit<CreateProductoData, 'empresa_id'>): Promise<Producto> {
    if (!data.nombre?.trim()) {
      throw Object.assign(new Error('El nombre es requerido'), { statusCode: 400 });
    }
    if (data.precio < 0) {
      throw Object.assign(new Error('El precio no puede ser negativo'), { statusCode: 400 });
    }
    if (data.stock < 0) {
      throw Object.assign(new Error('El stock no puede ser negativo'), { statusCode: 400 });
    }
    return this.productoRepository.create({ ...data, empresa_id: empresaId });
  }
}
