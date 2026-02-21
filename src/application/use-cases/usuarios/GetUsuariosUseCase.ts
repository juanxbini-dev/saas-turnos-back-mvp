import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { UsuarioPublico } from '../../../domain/entities/User';

export class GetUsuariosUseCase {
  constructor(private usuarioRepository: IUsuarioRepository) {}

  async execute(empresaId: string): Promise<UsuarioPublico[]> {
    return this.usuarioRepository.findByEmpresa(empresaId);
  }
}
