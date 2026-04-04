import { IUsuarioRepository, UpdateDatosData } from '../../../domain/repositories/IUsuarioRepository';
import { UsuarioPublico } from '../../../domain/entities/User';

export class UpdateUsuarioDatosUseCase {
  constructor(private usuarioRepository: IUsuarioRepository) {}

  async execute(id: string, data: UpdateDatosData): Promise<UsuarioPublico> {
    const usuario = await this.usuarioRepository.findById(id);
    if (!usuario) {
      throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
    }

    const usernameExists = await this.usuarioRepository.existeUsername(
      data.username,
      usuario.empresa_id,
      id
    );

    if (usernameExists) {
      throw Object.assign(new Error('El username ya está en uso'), { statusCode: 400 });
    }

    const emailExists = await this.usuarioRepository.existeEmail(
      data.email,
      usuario.empresa_id,
      id
    );

    if (emailExists) {
      throw Object.assign(new Error('El email ya está en uso'), { statusCode: 400 });
    }

    return this.usuarioRepository.updateDatos(id, data);
  }
}
