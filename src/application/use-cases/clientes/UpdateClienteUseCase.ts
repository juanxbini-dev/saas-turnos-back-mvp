import { IClienteRepository } from '../../../domain/repositories/IClienteRepository';
import { Cliente, UpdateClienteData } from '../../../domain/entities/Cliente';

export class UpdateClienteUseCase {
  constructor(private clienteRepository: IClienteRepository) {}

  async execute(
    id: string,
    data: UpdateClienteData,
    empresaId: string
  ): Promise<Cliente> {
    const cliente = await this.clienteRepository.findById(id);
    if (!cliente) {
      throw Object.assign(new Error('Cliente no encontrado'), { statusCode: 404 });
    }

    if (data.email && data.email !== cliente.email) {
      const emailExists = await this.clienteRepository.existeEmail(data.email, empresaId, id);
      if (emailExists) {
        throw Object.assign(new Error('Ya existe un cliente con ese email'), { statusCode: 400 });
      }
    }

    if (data.telefono !== undefined && data.telefono !== cliente.telefono) {
      if (data.telefono) {
        const telefonoExists = await this.clienteRepository.existeTelefono(data.telefono, empresaId, id);
        if (telefonoExists) {
          throw Object.assign(new Error('Ya existe un cliente con ese teléfono'), { statusCode: 400 });
        }
      }
    }

    return this.clienteRepository.update(id, data);
  }
}
