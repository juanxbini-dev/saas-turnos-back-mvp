import { IImageRepository } from '../../../domain/repositories/IImageRepository';
import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { UsuarioPublico } from '../../../domain/entities/User';

export class DeleteUsuarioAvatarUseCase {
  constructor(
    private imageRepository: IImageRepository,
    private usuarioRepository: IUsuarioRepository
  ) {}

  async execute(userId: string, empresaId: string): Promise<UsuarioPublico> {
    const usuario = await this.usuarioRepository.findByIdWithPassword(userId);
    if (!usuario) {
      throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
    }

    if (usuario.empresa_id !== empresaId) {
      throw Object.assign(new Error('No tiene permisos para modificar este usuario'), { statusCode: 403 });
    }

    if (!usuario.avatar_public_id) {
      throw Object.assign(new Error('El usuario no tiene avatar'), { statusCode: 400 });
    }

    await this.imageRepository.delete(usuario.avatar_public_id);

    return this.usuarioRepository.updateAvatar(userId, null, null);
  }
}
