import { IImageRepository } from '../../../domain/repositories/IImageRepository';
import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { pool } from '../../../infrastructure/database/postgres.connection';

export class DeleteUsuarioUseCase {
  constructor(
    private usuarioRepository: IUsuarioRepository,
    private imageRepository: IImageRepository
  ) {}

  async execute(id: string, adminId: string, empresaId: string): Promise<void> {
    if (id === adminId) {
      const error: any = new Error('No podés eliminar tu propia cuenta');
      error.statusCode = 403;
      throw error;
    }

    const usuario = await this.usuarioRepository.findByIdWithPassword(id);

    if (!usuario) {
      const error: any = new Error('Usuario no encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (usuario.empresa_id !== empresaId) {
      const error: any = new Error('No tenés permisos para eliminar este usuario');
      error.statusCode = 403;
      throw error;
    }

    // Limpiar avatar de Cloudinary si existe
    if (usuario.avatar_public_id) {
      try {
        await this.imageRepository.delete(usuario.avatar_public_id);
      } catch {
        // Si falla el delete de Cloudinary, continuamos con el delete del usuario
      }
    }

    // Eliminar registro de landing_profesionales si existe (FK sin CASCADE)
    await pool.query('DELETE FROM landing_profesionales WHERE usuario_id = $1', [id]);

    await this.usuarioRepository.delete(id);
  }
}
