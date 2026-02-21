import { IServicioRepository, UpdateServicioData } from '../../../domain/repositories/IServicioRepository';
import { Servicio } from '../../../domain/entities/Servicio';

export class UpdateServicioUseCase {
  constructor(private servicioRepository: IServicioRepository) {}

  async execute(id: string, data: UpdateServicioData): Promise<Servicio> {
    const servicio = await this.servicioRepository.findById(id);
    if (!servicio) {
      throw Object.assign(new Error('Servicio no encontrado'), { statusCode: 404 });
    }

    if (data.nombre !== undefined && !data.nombre?.trim()) {
      throw Object.assign(new Error('El nombre del servicio es requerido'), { statusCode: 400 });
    }

    if (data.duracion !== undefined && (data.duracion <= 0 || !data.duracion)) {
      throw Object.assign(new Error('La duración debe ser mayor a 0'), { statusCode: 400 });
    }

    return this.servicioRepository.update(id, data);
  }
}
