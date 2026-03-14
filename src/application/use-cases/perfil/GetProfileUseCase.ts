import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { UsuarioPublico } from '../../../domain/entities/User';

export class GetProfileUseCase {
  constructor(private usuarioRepository: IUsuarioRepository) {}

  async execute(userId: string): Promise<UsuarioPublico> {
    const usuario = await this.usuarioRepository.findById(userId);
    if (!usuario) {
      throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
    }

    return usuario;
  }
}
