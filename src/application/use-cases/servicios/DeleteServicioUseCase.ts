import { IServicioRepository } from '../../../domain/repositories/IServicioRepository';

export class DeleteServicioUseCase {
  constructor(private servicioRepository: IServicioRepository) {}

  async execute(id: string): Promise<void> {
    const servicio = await this.servicioRepository.findById(id);
    if (!servicio) {
      throw Object.assign(new Error('Servicio no encontrado'), { statusCode: 404 });
    }

    await this.servicioRepository.delete(id);
  }
}
