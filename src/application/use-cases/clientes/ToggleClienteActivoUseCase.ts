import { IClienteRepository } from '../../../domain/repositories/IClienteRepository';
import { Cliente } from '../../../domain/entities/Cliente';

export class ToggleClienteActivoUseCase {
  constructor(private clienteRepository: IClienteRepository) {}

  async execute(id: string, activo: boolean): Promise<Cliente> {
    const cliente = await this.clienteRepository.findById(id);
    if (!cliente) {
      throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 });
    }

    return this.clienteRepository.toggleActivo(id, activo);
  }
}
