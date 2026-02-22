import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';

interface ProfesionalesResponse {
  profesionales: Array<{
    id: string;
    nombre: string;
    username: string;
    email: string;
    roles: string[];
    activo: boolean;
  }>;
  total: number;
}

export class GetProfesionalesUseCase {
  constructor(private usuarioRepository: IUsuarioRepository) {}

  async execute(empresaId: string, params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<ProfesionalesResponse> {
    const page = params?.page || 1;
    const limit = params?.limit || 10;
    const search = params?.search;

    const queryParams: {
      page?: number;
      limit?: number;
      search?: string;
    } = {
      page,
      limit
    };

    if (search !== undefined) {
      queryParams.search = search;
    }

    const profesionales = await this.usuarioRepository.findProfesionalesByEmpresa(
      empresaId,
      queryParams
    );

    const total = await this.usuarioRepository.countProfesionalesByEmpresa(empresaId, search);

    return {
      profesionales: profesionales.map((p: any) => ({
        id: p.id,
        nombre: p.nombre,
        username: p.username || p.email,
        email: p.email,
        roles: p.roles,
        activo: p.activo
      })),
      total
    };
  }
}
