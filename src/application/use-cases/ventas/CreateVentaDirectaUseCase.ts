import { IVentaRepository } from '../../../domain/repositories/IVentaRepository';
import { Venta, CreateVentaData } from '../../../domain/entities/Venta';

export class CreateVentaDirectaUseCase {
  constructor(private ventaRepository: IVentaRepository) {}

  async execute(data: CreateVentaData): Promise<Venta> {
    if (!data.items || data.items.length === 0) {
      throw Object.assign(new Error('Debe incluir al menos un producto'), { statusCode: 400 });
    }
    for (const item of data.items) {
      if (!Number.isInteger(item.cantidad) || item.cantidad <= 0) {
        throw Object.assign(new Error('La cantidad debe ser un entero positivo'), { statusCode: 400 });
      }
      if (item.precio_unitario < 0) {
        throw Object.assign(new Error('El precio no puede ser negativo'), { statusCode: 400 });
      }
    }
    return this.ventaRepository.create(data);
  }
}
