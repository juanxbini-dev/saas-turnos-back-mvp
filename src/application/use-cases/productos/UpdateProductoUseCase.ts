import { IProductoRepository } from '../../../domain/repositories/IProductoRepository';
import { IConfiguracionProductosRepository } from '../../../domain/repositories/IConfiguracionProductosRepository';
import { Producto, UpdateProductoData } from '../../../domain/entities/Producto';
import { CONFIGURACION_PRODUCTOS_DEFAULT } from '../../../domain/entities/ConfiguracionProductos';
import { aplicarPreciosDerivados } from '../../../shared/utils/precios.utils';

export class UpdateProductoUseCase {
  constructor(
    private productoRepository: IProductoRepository,
    private configRepository: IConfiguracionProductosRepository
  ) {}

  async execute(id: string, empresaId: string, data: UpdateProductoData): Promise<Producto> {
    const producto = await this.productoRepository.findById(id);
    if (!producto || producto.empresa_id !== empresaId) {
      throw Object.assign(new Error('Producto no encontrado'), { statusCode: 404 });
    }
    // null = volver al precio derivado de la configuración; valor = override manual
    for (const [campo, precio] of Object.entries({
      'precio efectivo': data.precio_efectivo,
      'precio transferencia': data.precio_transferencia,
      'precio tarjeta': data.precio_tarjeta,
    })) {
      if (precio !== undefined && precio !== null && precio < 0) {
        throw Object.assign(new Error(`El ${campo} no puede ser negativo`), { statusCode: 400 });
      }
    }
    if (data.costo !== undefined && (data.costo == null || data.costo < 0)) {
      throw Object.assign(new Error('El costo es requerido y no puede ser negativo'), { statusCode: 400 });
    }
    if (data.stock !== undefined && (!Number.isInteger(data.stock) || data.stock < 0)) {
      throw Object.assign(new Error('El stock debe ser un número entero mayor o igual a 0'), { statusCode: 400 });
    }
    if (data.nombre !== undefined) {
      const existe = await this.productoRepository.findByNombre(empresaId, data.nombre.trim(), id);
      if (existe) {
        throw Object.assign(new Error(`Ya existe un producto con el nombre "${data.nombre.trim()}"`), { statusCode: 409 });
      }
      data.nombre = data.nombre.trim();
    }
    const actualizado = await this.productoRepository.update(id, data);
    const config = await this.configRepository.findByEmpresa(empresaId);
    return aplicarPreciosDerivados(actualizado, config ?? { empresa_id: empresaId, ...CONFIGURACION_PRODUCTOS_DEFAULT });
  }
}
