import { IClienteRepository } from '../../../domain/repositories/IClienteRepository';
import { Cliente } from '../../../domain/entities/Cliente';

export class GetClientesUseCase {
  constructor(private clienteRepository: IClienteRepository) {}

  async execute(empresaId: string): Promise<Cliente[]> {
    return this.clienteRepository.findByEmpresa(empresaId);
  }
}
