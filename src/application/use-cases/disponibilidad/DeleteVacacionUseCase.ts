import { IDisponibilidadRepository } from '../../../domain/repositories/IDisponibilidadRepository';

export class DeleteVacacionUseCase {
  constructor(private disponibilidadRepository: IDisponibilidadRepository) {}

  async execute(id: string, usuarioAutenticadoId: string): Promise<void> {
    // Primero obtener las vacaciones para verificar pertenencia
    const vacaciones = await this.disponibilidadRepository.findVacacionesByProfesional(usuarioAutenticadoId);
    const vacacion = vacaciones.find(v => v.id === id);

    if (!vacacion) {
      throw Object.assign(new Error('Vacación no encontrada o no pertenece al usuario'), { statusCode: 404 });
    }

    await this.disponibilidadRepository.deleteVacacion(id);
  }
}
