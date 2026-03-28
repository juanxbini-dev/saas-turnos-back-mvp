import { IMarcaRepository } from '../../../domain/repositories/IMarcaRepository';
import { Marca } from '../../../domain/entities/Marca';

export class CreateMarcaUseCase {
  constructor(private marcaRepository: IMarcaRepository) {}

  async execute(empresaId: string, nombre: string): Promise<Marca> {
    if (!nombre?.trim()) {
      throw Object.assign(new Error('El nombre es requerido'), { statusCode: 400 });
    }
    const existe = await this.marcaRepository.findByNombre(empresaId, nombre.trim());
    if (existe) {
      throw Object.assign(new Error(`Ya existe una marca con el nombre "${nombre.trim()}"`), { statusCode: 409 });
    }
    return this.marcaRepository.create({ nombre: nombre.trim(), empresa_id: empresaId });
  }
}
