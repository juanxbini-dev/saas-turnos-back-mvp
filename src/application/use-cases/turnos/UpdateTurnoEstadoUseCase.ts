import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';
import { Turno } from '../../../domain/entities/Turno';

export class UpdateTurnoEstadoUseCase {
  constructor(private turnoRepository: ITurnoRepository) {}

  async execute(id: string, estado: 'pendiente' | 'confirmado' | 'completado' | 'cancelado'): Promise<Turno> {
    // Permitir cambiar a confirmado o cancelado, lanzar error 400 para otros estados
    if (estado !== 'confirmado' && estado !== 'cancelado') {
      throw Object.assign(new Error('Solo se puede confirmar o cancelar un turno'), { statusCode: 400 });
    }

    return this.turnoRepository.updateEstado(id, estado);
  }
}
