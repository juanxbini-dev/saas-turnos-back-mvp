import { IUsuarioServicioRepository, UpdateUsuarioServicioData } from '../../../domain/repositories/IUsuarioServicioRepository';
import { UsuarioServicio } from '../../../domain/entities/Servicio';

export class UpdateMiServicioUseCase {
  constructor(private usuarioServicioRepository: IUsuarioServicioRepository) {}

  async execute(id: string, usuarioId: string, data: UpdateUsuarioServicioData): Promise<UsuarioServicio> {
    const usuarioServicio = await this.usuarioServicioRepository.findByUsuarioAndServicio(usuarioId, '');
    
    // Buscar el usuarioServicio específico por id y verificar que pertenezca al usuario
    const usuarioServicios = await this.usuarioServicioRepository.findByUsuario(usuarioId);
    const miServicio = usuarioServicios.find(us => us.id === id);
    
    if (!miServicio) {
      throw Object.assign(new Error('Servicio no encontrado'), { statusCode: 404 });
    }

    if (miServicio.usuario_id !== usuarioId) {
      throw Object.assign(new Error('No tienes permiso para editar este servicio'), { statusCode: 403 });
    }

    return this.usuarioServicioRepository.update(id, data);
  }
}
