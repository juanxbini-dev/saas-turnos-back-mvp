import { IDisponibilidadRepository, UpdateDisponibilidadData } from '../../../domain/repositories/IDisponibilidadRepository';
import { DisponibilidadSemanal } from '../../../domain/entities/Disponibilidad';

export class UpdateDisponibilidadUseCase {
  constructor(private disponibilidadRepository: IDisponibilidadRepository) {}

  async execute(
    id: string,
    data: UpdateDisponibilidadData,
    usuarioAutenticadoId: string
  ): Promise<DisponibilidadSemanal> {
    // Primero obtener la disponibilidad para verificar pertenencia
    const disponibilidades = await this.disponibilidadRepository.findDisponibilidadByProfesional(usuarioAutenticadoId);
    const disponibilidad = disponibilidades.find(d => d.id === id);

    if (!disponibilidad) {
      throw Object.assign(new Error('Disponibilidad no encontrada o no pertenece al usuario'), { statusCode: 404 });
    }

    if (data.intervalo_minutos !== undefined) {
      if (data.intervalo_minutos < 60 || data.intervalo_minutos % 60 !== 0) {
        throw Object.assign(new Error('El intervalo debe ser en horas completas (mínimo 60 minutos)'), { statusCode: 400 });
      }
    }

    return this.disponibilidadRepository.updateDisponibilidad(id, data);
  }
}
