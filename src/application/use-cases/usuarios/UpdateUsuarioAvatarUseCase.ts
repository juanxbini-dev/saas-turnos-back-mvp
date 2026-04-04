import { IImageRepository } from '../../../domain/repositories/IImageRepository';
import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { UsuarioPublico } from '../../../domain/entities/User';

export class UpdateUsuarioAvatarUseCase {
  constructor(
    private imageRepository: IImageRepository,
    private usuarioRepository: IUsuarioRepository
  ) {}

  async execute(userId: string, empresaId: string, file: Buffer): Promise<UsuarioPublico> {
    const usuario = await this.usuarioRepository.findByIdWithPassword(userId);
    if (!usuario) {
      throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
    }

    if (usuario.empresa_id !== empresaId) {
      throw Object.assign(new Error('No tiene permisos para modificar este usuario'), { statusCode: 403 });
    }

    if (usuario.avatar_public_id) {
      try {
        await this.imageRepository.delete(usuario.avatar_public_id);
      } catch (error) {
        console.error('Error al eliminar avatar anterior:', error);
      }
    }

    const result = await this.imageRepository.upload(
      file,
      `avatars/${usuario.empresa_id}`,
      `user-${userId}`
    );

    return this.usuarioRepository.updateAvatar(userId, result.url, result.publicId);
  }
}
