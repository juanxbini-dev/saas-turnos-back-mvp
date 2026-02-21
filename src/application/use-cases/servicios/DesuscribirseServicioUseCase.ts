import { IUsuarioServicioRepository } from '../../../domain/repositories/IUsuarioServicioRepository';

export class DesuscribirseServicioUseCase {
  constructor(private usuarioServicioRepository: IUsuarioServicioRepository) {}

  async execute(usuarioServicioId: string, usuarioId: string): Promise<void> {
    const usuarioServicios = await this.usuarioServicioRepository.findByUsuario(usuarioId);
    const miServicio = usuarioServicios.find(us => us.id === usuarioServicioId);
    
    if (!miServicio) {
      throw Object.assign(new Error('Servicio no encontrado'), { statusCode: 404 });
    }

    if (miServicio.usuario_id !== usuarioId) {
      throw Object.assign(new Error('No tienes permiso para eliminar esta suscripción'), { statusCode: 403 });
    }

    await this.usuarioServicioRepository.delete(usuarioServicioId);
  }
}
