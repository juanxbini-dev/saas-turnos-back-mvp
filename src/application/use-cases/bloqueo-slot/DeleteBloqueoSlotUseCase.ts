import { IBloqueoSlotRepository } from '../../../domain/repositories/IBloqueoSlotRepository';

export class DeleteBloqueoSlotUseCase {
  constructor(private bloqueoSlotRepository: IBloqueoSlotRepository) {}

  async execute(id: string, usuarioAutenticadoId: string, roles: string[]): Promise<void> {
    const isSuperAdmin = roles.includes('super_admin') || roles.includes('admin');
    return this.bloqueoSlotRepository.delete(id, isSuperAdmin ? null : usuarioAutenticadoId);
  }
}
