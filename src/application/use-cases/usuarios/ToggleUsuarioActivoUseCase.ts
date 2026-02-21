import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { UsuarioPublico } from '../../../domain/entities/User';

export class ToggleUsuarioActivoUseCase {
  constructor(private usuarioRepository: IUsuarioRepository) {}

  async execute(id: string, activo: boolean, adminId: string): Promise<UsuarioPublico> {
    if (id === adminId) {
      throw Object.assign(new Error('No podés desactivar tu propia cuenta'), { statusCode: 403 });
    }

    return this.usuarioRepository.toggleActivo(id, activo);
  }
}
