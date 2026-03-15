import { IProductoRepository } from '../../../domain/repositories/IProductoRepository';

export class DeleteProductoUseCase {
  constructor(private productoRepository: IProductoRepository) {}

  async execute(id: string, empresaId: string): Promise<void> {
    const producto = await this.productoRepository.findById(id);
    if (!producto || producto.empresa_id !== empresaId) {
      throw Object.assign(new Error('Producto no encontrado'), { statusCode: 404 });
    }
    await this.productoRepository.delete(id);
  }
}
