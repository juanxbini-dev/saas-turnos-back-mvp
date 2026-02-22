import { IDisponibilidadRepository } from '../../../domain/repositories/IDisponibilidadRepository';

export class DeleteDisponibilidadUseCase {
  constructor(private disponibilidadRepository: IDisponibilidadRepository) {}

  async execute(id: string, usuarioAutenticadoId: string): Promise<void> {
    // Primero obtener la disponibilidad para verificar pertenencia
    const disponibilidades = await this.disponibilidadRepository.findDisponibilidadByProfesional(usuarioAutenticadoId);
    const disponibilidad = disponibilidades.find(d => d.id === id);

    if (!disponibilidad) {
      throw Object.assign(new Error('Disponibilidad no encontrada o no pertenece al usuario'), { statusCode: 404 });
    }

    await this.disponibilidadRepository.deleteDisponibilidad(id);
  }
}
