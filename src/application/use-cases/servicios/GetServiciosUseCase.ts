import { IServicioRepository } from '../../../domain/repositories/IServicioRepository';
import { Servicio } from '../../../domain/entities/Servicio';

export class GetServiciosUseCase {
  constructor(private servicioRepository: IServicioRepository) {}

  async execute(empresaId: string): Promise<Servicio[]> {
    return this.servicioRepository.findByEmpresa(empresaId);
  }
}
