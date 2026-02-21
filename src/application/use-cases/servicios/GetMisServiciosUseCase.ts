import { IUsuarioServicioRepository } from '../../../domain/repositories/IUsuarioServicioRepository';
import { UsuarioServicio } from '../../../domain/entities/Servicio';

export class GetMisServiciosUseCase {
  constructor(private usuarioServicioRepository: IUsuarioServicioRepository) {}

  async execute(usuarioId: string): Promise<UsuarioServicio[]> {
    return this.usuarioServicioRepository.findByUsuario(usuarioId);
  }
}
