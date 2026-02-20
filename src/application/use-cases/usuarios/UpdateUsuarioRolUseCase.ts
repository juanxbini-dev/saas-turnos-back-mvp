import { IUsuarioRepository } from '../../domain/repositories/IUsuarioRepository';
import { UsuarioPublico } from '../../domain/entities/User';

export class UpdateUsuarioRolUseCase {
  constructor(private usuarioRepository: IUsuarioRepository) {}

  async execute(id: string, nuevoRol: 'admin' | 'staff', adminId: string): Promise<UsuarioPublico> {
    if (id === adminId) {
      throw Object.assign(new Error('No podés quitarte el rol de administrador'), { statusCode: 403 });
    }

    const roles = nuevoRol === 'admin' ? ['admin', 'staff'] : ['staff'];
    return this.usuarioRepository.updateRol(id, roles);
  }
}
