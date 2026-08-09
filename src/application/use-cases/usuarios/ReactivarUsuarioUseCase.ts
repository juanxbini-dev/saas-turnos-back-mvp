import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { UsuarioPublico } from '../../../domain/entities/User';

export class ReactivarUsuarioUseCase {
  constructor(private usuarioRepository: IUsuarioRepository) {}

  async execute(id: string, empresaId: string): Promise<UsuarioPublico> {
    const usuario = await this.usuarioRepository.findById(id);

    if (!usuario) {
      const error: any = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (usuario.empresa_id !== empresaId) {
      const error: any = new Error('No tenés permisos para rehabilitar este usuario');
      error.statusCode = 403;
      throw error;
    }

    return this.usuarioRepository.setActivo(id, true);
  }
}
