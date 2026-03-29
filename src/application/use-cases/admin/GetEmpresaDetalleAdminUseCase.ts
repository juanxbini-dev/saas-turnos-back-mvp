import { IAdminRepository, EmpresaDetalle } from '../../../domain/repositories/IAdminRepository';

export class GetEmpresaDetalleAdminUseCase {
  constructor(private adminRepository: IAdminRepository) {}

  async execute(empresaId: string): Promise<EmpresaDetalle> {
    const empresa = await this.adminRepository.getEmpresaDetalle(empresaId);
    if (!empresa) {
      const error = new Error('Empresa no encontrada');
      (error as any).statusCode = 404;
      throw error;
    }
    return empresa;
  }
}
