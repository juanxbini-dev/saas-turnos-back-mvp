import { IServicioRepository } from '../../../domain/repositories/IServicioRepository';
import { Servicio } from '../../../domain/entities/Servicio';

export class ToggleServicioActivoUseCase {
  constructor(private servicioRepository: IServicioRepository) {}

  async execute(id: string, activo: boolean): Promise<Servicio> {
    const servicio = await this.servicioRepository.findById(id);
    if (!servicio) {
      throw Object.assign(new Error('Servicio no encontrado'), { statusCode: 404 });
    }

    return this.servicioRepository.toggleActivo(id, activo);
  }
}
