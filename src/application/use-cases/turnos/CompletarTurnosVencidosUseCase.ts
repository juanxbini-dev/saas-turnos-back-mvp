import { ITurnoRepository } from '../../../domain/repositories/ITurnoRepository';

export class CompletarTurnosVencidosUseCase {
  constructor(private turnoRepository: ITurnoRepository) {}

  async execute(): Promise<number> {
    const count = await this.turnoRepository.completarVencidos();
    console.log(`✅ [Cron] ${count} turnos completados automáticamente`);
    return count;
  }
}
