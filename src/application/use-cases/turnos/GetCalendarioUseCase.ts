import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';
import { TurnoConDetalle } from '../../../domain/entities/Turno';

export class GetCalendarioUseCase {
  constructor(private turnoRepository: ITurnoRepository) {}

  async execute(
    profesionalId: string,
    fechaInicio: string,
    fechaFin: string
  ): Promise<TurnoConDetalle[]> {
    return this.turnoRepository.findByProfesionalEnRango(
      profesionalId,
      fechaInicio,
      fechaFin
    );
  }
}
