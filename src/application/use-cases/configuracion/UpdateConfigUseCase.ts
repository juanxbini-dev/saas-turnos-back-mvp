import { ILandingConfigRepository, UpdateLandingConfigData } from '../../../domain/repositories/ILandingConfigRepository';
import { LandingConfig } from '../../../domain/entities/LandingConfig';

export class UpdateConfigUseCase {
  constructor(private landingConfigRepository: ILandingConfigRepository) {}

  async execute(empresaId: string, data: UpdateLandingConfigData): Promise<LandingConfig> {
    await this.landingConfigRepository.upsert(empresaId);
    return await this.landingConfigRepository.update(empresaId, data);
  }
}
