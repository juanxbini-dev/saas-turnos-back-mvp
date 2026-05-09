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

    const turnosActivos = await this.clienteRepository.tieneTurnosActivos(id);
    if (turnosActivos > 0) {
      const error: any = new Error(`No se puede eliminar el cliente porque tiene ${turnosActivos} turno${turnosActivos === 1 ? '' : 's'} pendiente${turnosActivos === 1 ? '' : 's'} o confirmado${turnosActivos === 1 ? '' : 's'}`);
      error.statusCode = 409;
      throw error;
    }

    await this.clienteRepository.delete(id);
  }
}
