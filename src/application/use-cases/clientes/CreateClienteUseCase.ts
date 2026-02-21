import { IClienteRepository } from '../../../domain/repositories/IClienteRepository';
import { Cliente } from '../../../domain/entities/Cliente';
import { CryptoService } from '../../../infrastructure/security/crypto.service';

export class CreateClienteUseCase {
  constructor(
    private clienteRepository: IClienteRepository,
    private cryptoService: CryptoService
  ) {}

  async execute(
    nombre: string,
    email: string,
    telefono: string | undefined,
    empresaId: string
  ): Promise<Cliente> {
    const emailExists = await this.clienteRepository.existeEmail(email, empresaId);
    if (emailExists) {
      throw Object.assign(new Error('Ya existe un cliente con ese email'), { statusCode: 400 });
    }

    if (telefono) {
      const telefonoExists = await this.clienteRepository.existeTelefono(telefono, empresaId);
      if (telefonoExists) {
        throw Object.assign(new Error('Ya existe un cliente con ese teléfono'), { statusCode: 400 });
      }
    }

    const id = this.cryptoService.generateUUID();

    return this.clienteRepository.create({
      id,
      nombre,
      email,
      ...(telefono && { telefono }),
      empresa_id: empresaId
    });
  }
}
