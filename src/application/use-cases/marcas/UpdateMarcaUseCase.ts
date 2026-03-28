import { IMarcaRepository } from '../../../domain/repositories/IMarcaRepository';
import { Marca } from '../../../domain/entities/Marca';

export class UpdateMarcaUseCase {
  constructor(private marcaRepository: IMarcaRepository) {}

  async execute(id: string, empresaId: string, nombre: string): Promise<Marca> {
    const marca = await this.marcaRepository.findById(id);
    if (!marca || marca.empresa_id !== empresaId) {
      throw Object.assign(new Error('Marca no encontrada'), { statusCode: 404 });
    }
    if (!nombre?.trim()) {
      throw Object.assign(new Error('El nombre es requerido'), { statusCode: 400 });
    }
    const existe = await this.marcaRepository.findByNombre(empresaId, nombre.trim(), id);
    if (existe) {
      throw Object.assign(new Error(`Ya existe una marca con el nombre "${nombre.trim()}"`), { statusCode: 409 });
    }
    return this.marcaRepository.update(id, { nombre: nombre.trim() });
  }
}
