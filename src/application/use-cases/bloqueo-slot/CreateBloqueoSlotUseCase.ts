import { IBloqueoSlotRepository } from '../../../domain/repositories/IBloqueoSlotRepository';
import { BloqueoSlot } from '../../../domain/entities/BloqueoSlot';
import { CryptoService } from '../../../infrastructure/security/crypto.service';

export class CreateBloqueoSlotUseCase {
  constructor(
    private bloqueoSlotRepository: IBloqueoSlotRepository,
    private cryptoService: CryptoService
  ) {}

  async execute(
    profesionalId: string,
    empresaId: string,
    fecha: string,
    horaInicio: string,
    horaFin: string,
    motivo: string | null
  ): Promise<BloqueoSlot> {
    const id = this.cryptoService.generateUUID();

    return this.bloqueoSlotRepository.create({
      id,
      empresa_id: empresaId,
      profesional_id: profesionalId,
      fecha,
      hora_inicio: horaInicio,
      hora_fin: horaFin,
      ...(motivo && { motivo })
    });
  }
}
