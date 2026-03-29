import { IAdminRepository, EmpresaConStats } from '../../../domain/repositories/IAdminRepository';

export class GetEmpresasAdminUseCase {
  constructor(private adminRepository: IAdminRepository) {}

  async execute(): Promise<EmpresaConStats[]> {
    return this.adminRepository.getEmpresas();
  }
}
