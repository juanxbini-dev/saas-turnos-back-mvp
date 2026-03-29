import { IAdminRepository } from '../../../domain/repositories/IAdminRepository';
import { Empresa } from '../../../domain/entities/Empresa';

export class ToggleEmpresaActivoAdminUseCase {
  constructor(private adminRepository: IAdminRepository) {}

  async execute(empresaId: string): Promise<Empresa> {
    const empresa = await this.adminRepository.getEmpresaDetalle(empresaId);
    if (!empresa) {
      const error = new Error('Empresa no encontrada');
      (error as any).statusCode = 404;
      throw error;
    }
    return this.adminRepository.toggleEmpresaActivo(empresaId);
  }
}
