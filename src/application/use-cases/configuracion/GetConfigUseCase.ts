import { ILandingConfigRepository } from '../../../domain/repositories/ILandingConfigRepository';
import { LandingConfig } from '../../../domain/entities/LandingConfig';

export class GetConfigUseCase {
  constructor(private landingConfigRepository: ILandingConfigRepository) {}

  async execute(empresaId: string): Promise<LandingConfig> {
    // Si no existe config para la empresa, la crea con valores vacíos
    return await this.landingConfigRepository.upsert(empresaId);
  }
}
