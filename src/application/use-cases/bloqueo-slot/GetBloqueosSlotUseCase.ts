import { IBloqueoSlotRepository } from '../../../domain/repositories/IBloqueoSlotRepository';
import { BloqueoSlot } from '../../../domain/entities/BloqueoSlot';

export class GetBloqueosSlotUseCase {
  constructor(private bloqueoSlotRepository: IBloqueoSlotRepository) {}

  async executeByRango(profesionalId: string, fechaInicio: string, fechaFin: string): Promise<BloqueoSlot[]> {
    return this.bloqueoSlotRepository.findByProfesionalAndRango(profesionalId, fechaInicio, fechaFin);
  }
}
