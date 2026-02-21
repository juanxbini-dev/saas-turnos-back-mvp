import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { PasswordService } from '../../../infrastructure/security/password.service'; 

export class UpdateUsuarioPasswordUseCase {
  constructor(
    private usuarioRepository: IUsuarioRepository,
    private passwordService: PasswordService
  ) {}

  async execute(id: string, passwordActual: string, passwordNueva: string): Promise<void> {
    const usuario = await this.usuarioRepository.findByIdWithPassword(id);
    if (!usuario) {
      throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
    }

    const passwordValida = await this.passwordService.compare(passwordActual, usuario.password);
    if (!passwordValida) {
      throw Object.assign(new Error('Contraseña actual incorrecta'), { statusCode: 400 });
    }

    const hashedPassword = await this.passwordService.hash(passwordNueva);
    await this.usuarioRepository.updatePassword(id, hashedPassword);
  }
}
