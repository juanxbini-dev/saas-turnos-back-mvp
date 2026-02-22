import { IDisponibilidadRepository } from '../../../domain/repositories/IDisponibilidadRepository';
import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';
import { DisponibilidadService } from '../../../domain/services/DisponibilidadService';

export class GetSlotsDisponiblesUseCase {
  constructor(
    private disponibilidadRepository: IDisponibilidadRepository,
    private turnoRepository: ITurnoRepository,
    private disponibilidadService: DisponibilidadService
  ) {}

  async execute(profesionalId: string, fecha: string): Promise<string[]> {
    const [disponibilidades, excepciones, turnosExistentes] = await Promise.all([
      this.disponibilidadRepository.findDisponibilidadByProfesional(profesionalId),
      this.disponibilidadRepository.findExcepcionesByProfesional(profesionalId),
      this.turnoRepository.findByFechaYProfesional(profesionalId, fecha)
    ]);

    return this.disponibilidadService.calcularSlotsDisponibles(
      disponibilidades,
      excepciones,
      turnosExistentes,
      fecha
    );
  }
}
