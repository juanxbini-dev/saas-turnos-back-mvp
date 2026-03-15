import { ILandingProfesionalRepository } from '../../../domain/repositories/ILandingConfigRepository';

export class UpdateOrdenUseCase {
  constructor(private landingProfesionalRepository: ILandingProfesionalRepository) {}

  async execute(empresaId: string, orden: { usuarioId: string; orden: number }[]): Promise<void> {
    await this.landingProfesionalRepository.updateOrden(empresaId, orden);
  }
}
