import { IDisponibilidadRepository } from '../../../domain/repositories/IDisponibilidadRepository';

export class DeleteExcepcionUseCase {
  constructor(private disponibilidadRepository: IDisponibilidadRepository) {}

  async execute(id: string, usuarioAutenticadoId: string): Promise<void> {
    // Primero obtener las excepciones para verificar pertenencia
    const excepciones = await this.disponibilidadRepository.findExcepcionesByProfesional(usuarioAutenticadoId);
    const excepcion = excepciones.find(e => e.id === id);

    if (!excepcion) {
      throw Object.assign(new Error('Excepción no encontrada o no pertenece al usuario'), { statusCode: 404 });
    }

    await this.disponibilidadRepository.deleteExcepcion(id);
  }
}
