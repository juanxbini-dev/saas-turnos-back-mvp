import { IDisponibilidadRepository, UpdateVacacionData } from '../../../domain/repositories/IDisponibilidadRepository';
import { DiasVacacion } from '../../../domain/entities/Disponibilidad';

export class UpdateVacacionUseCase {
  constructor(private disponibilidadRepository: IDisponibilidadRepository) {}

  async execute(
    id: string,
    data: UpdateVacacionData,
    usuarioAutenticadoId: string
  ): Promise<DiasVacacion> {
    // Primero obtener las vacaciones para verificar pertenencia
    const vacaciones = await this.disponibilidadRepository.findVacacionesByProfesional(usuarioAutenticadoId);
    const vacacion = vacaciones.find(v => v.id === id);

    if (!vacacion) {
      throw Object.assign(new Error('Vacación no encontrada o no pertenece al usuario'), { statusCode: 404 });
    }

    return this.disponibilidadRepository.updateVacacion(id, data);
  }
}
