import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';
import { Turno } from '../../../domain/entities/Turno';

export class UpdateTurnoEstadoUseCase {
  constructor(private turnoRepository: ITurnoRepository) {}

  async execute(id: string, estado: 'pendiente' | 'confirmado' | 'completado' | 'cancelado'): Promise<Turno> {
    // Solo se puede cancelar un turno desde este endpoint
    if (estado !== 'cancelado') {
      throw Object.assign(new Error('Solo se puede cancelar un turno'), { statusCode: 400 });
    }

    return this.turnoRepository.updateEstado(id, estado);
  }
}
