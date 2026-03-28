import { IMarcaRepository } from '../../../domain/repositories/IMarcaRepository';

export class DeleteMarcaUseCase {
  constructor(private marcaRepository: IMarcaRepository) {}

  async execute(id: string, empresaId: string): Promise<{ productosAfectados: number }> {
    const marca = await this.marcaRepository.findById(id);
    if (!marca || marca.empresa_id !== empresaId) {
      throw Object.assign(new Error('Marca no encontrada'), { statusCode: 404 });
    }
    const productosAfectados = await this.marcaRepository.countProductos(id);
    await this.marcaRepository.delete(id);
    return { productosAfectados };
  }
}
