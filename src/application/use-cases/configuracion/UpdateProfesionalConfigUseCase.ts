import { ILandingProfesionalRepository } from '../../../domain/repositories/ILandingConfigRepository';
import { LandingProfesional } from '../../../domain/entities/LandingConfig';

export class UpdateProfesionalConfigUseCase {
  constructor(private landingProfesionalRepository: ILandingProfesionalRepository) {}

  async execute(
    empresaId: string,
    usuarioId: string,
    data: { descripcion?: string; visible?: boolean }
  ): Promise<LandingProfesional> {
    // Garantizar que exista la fila antes de actualizar
    await this.landingProfesionalRepository.upsert(empresaId, usuarioId);
    return await this.landingProfesionalRepository.update(empresaId, usuarioId, data);
  }
}
