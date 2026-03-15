import { ILandingConfigRepository, ILandingProfesionalRepository } from '../../../domain/repositories/ILandingConfigRepository';
import { LandingConfig, LandingProfesional } from '../../../domain/entities/LandingConfig';

export interface LandingPublicaData {
  config: LandingConfig;
  profesionales: LandingProfesional[];
}

export class GetLandingPublicaUseCase {
  constructor(
    private landingConfigRepository: ILandingConfigRepository,
    private landingProfesionalRepository: ILandingProfesionalRepository
  ) {}

  async execute(empresaId: string): Promise<LandingPublicaData> {
    const [config, profesionales] = await Promise.all([
      this.landingConfigRepository.upsert(empresaId),
      this.landingProfesionalRepository.findVisiblesByEmpresa(empresaId)
    ]);

    return { config, profesionales };
  }
}
