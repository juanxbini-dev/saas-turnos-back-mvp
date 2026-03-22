import { IBloqueoSlotRepository } from '../../../domain/repositories/IBloqueoSlotRepository';

export class DeleteBloqueoSlotUseCase {
  constructor(private bloqueoSlotRepository: IBloqueoSlotRepository) {}

  async execute(id: string, profesionalId: string, usuarioAutenticadoId: string): Promise<void> {
    if (profesionalId !== usuarioAutenticadoId) {
      throw Object.assign(new Error('No puedes eliminar bloqueos de otro profesional'), { statusCode: 403 });
    }

    return this.bloqueoSlotRepository.delete(id, profesionalId);
  }
}
