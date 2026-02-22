import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';
import { TurnoConDetalle } from '../../../domain/entities/Turno';

export class GetTurnosUseCase {
  constructor(private turnoRepository: ITurnoRepository) {}

  async execute(empresaId: string, usuarioId: string | null, isAdmin: boolean): Promise<TurnoConDetalle[]> {
    if (isAdmin) {
      return this.turnoRepository.findByEmpresa(empresaId);
    } else {
      return this.turnoRepository.findByProfesional(usuarioId!);
    }
  }
}
