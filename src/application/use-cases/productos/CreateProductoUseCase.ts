import { IProductoRepository } from '../../../domain/repositories/IProductoRepository';
import { IConfiguracionProductosRepository } from '../../../domain/repositories/IConfiguracionProductosRepository';
import { Producto, CreateProductoData } from '../../../domain/entities/Producto';
import { CONFIGURACION_PRODUCTOS_DEFAULT } from '../../../domain/entities/ConfiguracionProductos';
import { aplicarPreciosDerivados } from '../../../shared/utils/precios.utils';

export class CreateProductoUseCase {
  constructor(
    private productoRepository: IProductoRepository,
    private configRepository: IConfiguracionProductosRepository
  ) {}

  async execute(empresaId: string, data: Omit<CreateProductoData, 'empresa_id'>): Promise<Producto> {
    if (!data.nombre?.trim()) {
      throw Object.assign(new Error('El nombre es requerido'), { statusCode: 400 });
    }
    if (data.costo == null || Number.isNaN(Number(data.costo))) {
      throw Object.assign(new Error('El costo es requerido'), { statusCode: 400 });
    }
    if (data.costo < 0) {
      throw Object.assign(new Error('El costo no puede ser negativo'), { statusCode: 400 });
    }
    for (const [campo, precio] of Object.entries({
      'precio efectivo': data.precio_efectivo,
      'precio transferencia': data.precio_transferencia,
      'precio tarjeta': data.precio_tarjeta,
    })) {
      if (precio != null && precio < 0) {
        throw Object.assign(new Error(`El ${campo} no puede ser negativo`), { statusCode: 400 });
      }
    }
    if (data.stock < 0) {
      throw Object.assign(new Error('El stock no puede ser negativo'), { statusCode: 400 });
    }
    const existe = await this.productoRepository.findByNombre(empresaId, data.nombre.trim());
    if (existe) {
      throw Object.assign(new Error(`Ya existe un producto con el nombre "${data.nombre.trim()}"`), { statusCode: 409 });
    }
    const creado = await this.productoRepository.create({ ...data, nombre: data.nombre.trim(), empresa_id: empresaId });
    const config = await this.configRepository.findByEmpresa(empresaId);
    return aplicarPreciosDerivados(creado, config ?? { empresa_id: empresaId, ...CONFIGURACION_PRODUCTOS_DEFAULT });
  }
}
