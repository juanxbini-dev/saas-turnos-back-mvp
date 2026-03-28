import { IMarcaRepository } from '../../../domain/repositories/IMarcaRepository';
import { MarcaConProductos } from '../../../domain/entities/Marca';

export class GetMarcasUseCase {
  constructor(private marcaRepository: IMarcaRepository) {}

  async execute(empresaId: string): Promise<MarcaConProductos[]> {
    return this.marcaRepository.findAll(empresaId);
  }
}
