import { IAdminRepository, GlobalStats } from '../../../domain/repositories/IAdminRepository';

export class GetGlobalStatsUseCase {
  constructor(private adminRepository: IAdminRepository) {}

  async execute(): Promise<GlobalStats> {
    return this.adminRepository.getGlobalStats();
  }
}
