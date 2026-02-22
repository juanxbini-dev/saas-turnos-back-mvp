import { IDisponibilidadRepository, UpdateExcepcionData } from '../../../domain/repositories/IDisponibilidadRepository';
import { ExcepcionDia } from '../../../domain/entities/Disponibilidad';

export class UpdateExcepcionUseCase {
  constructor(private disponibilidadRepository: IDisponibilidadRepository) {}

  async execute(
    id: string,
    data: UpdateExcepcionData,
    usuarioAutenticadoId: string
  ): Promise<ExcepcionDia> {
    // Primero obtener las excepciones para verificar pertenencia
    const excepciones = await this.disponibilidadRepository.findExcepcionesByProfesional(usuarioAutenticadoId);
    const excepcion = excepciones.find(e => e.id === id);

    if (!excepcion) {
      throw Object.assign(new Error('Excepción no encontrada o no pertenece al usuario'), { statusCode: 404 });
    }

    return this.disponibilidadRepository.updateExcepcion(id, data);
  }
}
