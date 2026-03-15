import { IProductoRepository } from '../../../domain/repositories/IProductoRepository';
import { Producto, UpdateProductoData } from '../../../domain/entities/Producto';

export class UpdateProductoUseCase {
  constructor(private productoRepository: IProductoRepository) {}

  async execute(id: string, empresaId: string, data: UpdateProductoData): Promise<Producto> {
    const producto = await this.productoRepository.findById(id);
    if (!producto || producto.empresa_id !== empresaId) {
      throw Object.assign(new Error('Producto no encontrado'), { statusCode: 404 });
    }
    if (data.precio !== undefined && data.precio < 0) {
      throw Object.assign(new Error('El precio no puede ser negativo'), { statusCode: 400 });
    }
    if (data.nombre !== undefined) {
      const existe = await this.productoRepository.findByNombre(empresaId, data.nombre.trim(), id);
      if (existe) {
        throw Object.assign(new Error(`Ya existe un producto con el nombre "${data.nombre.trim()}"`), { statusCode: 409 });
      }
      data.nombre = data.nombre.trim();
    }
    return this.productoRepository.update(id, data);
  }
}
