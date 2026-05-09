import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { PasswordService } from '../../../infrastructure/security/password.service';

export class ResetUsuarioPasswordAdminUseCase {
  constructor(
    private usuarioRepository: IUsuarioRepository,
    private passwordService: PasswordService
  ) {}

  async execute(usuarioId: string, nuevaPassword: string): Promise<void> {
    const usuario = await this.usuarioRepository.findById(usuarioId);
    if (!usuario) {
      throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
    }

    const hashedPassword = await this.passwordService.hash(nuevaPassword);
    await this.usuarioRepository.updatePassword(usuarioId, hashedPassword);
  }
}
