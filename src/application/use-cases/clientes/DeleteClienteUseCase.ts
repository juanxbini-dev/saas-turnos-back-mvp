import { IClienteRepository } from '../../../domain/repositories/IClienteRepository';

export class DeleteClienteUseCase {
  constructor(private clienteRepository: IClienteRepository) {}

  async execute(id: string, empresaId: string): Promise<void> {
    const cliente = await this.clienteRepository.findById(id);

    if (!cliente) {
      const error: any = new Error('Cliente no encontrado');
      error.statusCode = 404;
      throw error;
    }

    if (cliente.empresa_id !== empresaId) {
      const error: any = new Error('No tenés permisos para eliminar este cliente');
      error.statusCode = 403;
      throw error;
    }

    await this.clienteRepository.delete(id);
  }
}
