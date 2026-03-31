import { IProductoRepository } from '../../../domain/repositories/IProductoRepository';
import { Producto, CreateProductoData } from '../../../domain/entities/Producto';

export class CreateProductoUseCase {
  constructor(private productoRepository: IProductoRepository) {}

  async execute(empresaId: string, data: Omit<CreateProductoData, 'empresa_id'>): Promise<Producto> {
    if (!data.nombre?.trim()) {
      throw Object.assign(new Error('El nombre es requerido'), { statusCode: 400 });
    }
    if (data.precio_efectivo < 0 || data.precio_transferencia < 0) {
      throw Object.assign(new Error('El precio no puede ser negativo'), { statusCode: 400 });
    }
    if (data.costo !== undefined && data.costo !== null && data.costo < 0) {
      throw Object.assign(new Error('El costo no puede ser negativo'), { statusCode: 400 });
    }
    if (data.stock < 0) {
      throw Object.assign(new Error('El stock no puede ser negativo'), { statusCode: 400 });
    }
    const existe = await this.productoRepository.findByNombre(empresaId, data.nombre.trim());
    if (existe) {
      throw Object.assign(new Error(`Ya existe un producto con el nombre "${data.nombre.trim()}"`), { statusCode: 409 });
    }
    return this.productoRepository.create({ ...data, nombre: data.nombre.trim(), empresa_id: empresaId });
  }
}
