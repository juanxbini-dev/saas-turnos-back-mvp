import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';

export interface GetProfesionalesPublicRequest {
  empresaId: string;
}

export interface ProfesionalPublic {
  id: string;
  nombre: string;
  username: string;
  email: string;
  roles: string[];
  activo: boolean;
}

export class GetProfesionalesPublicUseCase {
  constructor(private usuarioRepository: IUsuarioRepository) {}

  async execute(request: GetProfesionalesPublicRequest): Promise<ProfesionalPublic[]> {
    const { empresaId } = request;

    // Obtener usuarios activos con rol staff o admin de la empresa
    const usuarios = await this.usuarioRepository.findProfesionalesByEmpresa(empresaId);

    // Filtrar solo públicos (activos y con rol staff/admin)
    return usuarios
      .filter(usuario => 
        usuario.activo && 
        (usuario.roles.includes('staff') || usuario.roles.includes('admin'))
      )
      .map(usuario => ({
        id: usuario.id,
        nombre: usuario.nombre,
        username: usuario.username,
        email: usuario.email,
        roles: usuario.roles,
        activo: usuario.activo
      }));
  }
}
