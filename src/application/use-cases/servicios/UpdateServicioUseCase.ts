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

    if (data.duracion !== undefined && (data.duracion < 60 || data.duracion % 60 !== 0)) {
      throw Object.assign(new Error('La duración debe ser en horas completas (mínimo 60 minutos)'), { statusCode: 400 });
    }

    return this.servicioRepository.update(id, data);
  }
}
