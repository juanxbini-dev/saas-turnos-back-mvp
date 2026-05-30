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
    email: string | undefined,
    telefono: string | undefined,
    empresaId: string
  ): Promise<Cliente> {
    // Validar email duplicado solo si se proporciona email. Adjuntamos el cliente
    // existente al error para que el frontend pueda ofrecer "usar el cliente existente".
    if (email) {
      const existentePorEmail = await this.clienteRepository.findByEmail(email, empresaId);
      if (existentePorEmail) {
        throw Object.assign(new Error('Ya existe un cliente con ese email'), {
          statusCode: 400,
          cliente: existentePorEmail
        });
      }
    }

    // Validar teléfono duplicado si se proporciona
    if (telefono) {
      const existentePorTelefono = await this.clienteRepository.findByTelefono(telefono, empresaId);
      if (existentePorTelefono) {
        throw Object.assign(new Error('Ya existe un cliente con ese teléfono'), {
          statusCode: 400,
          cliente: existentePorTelefono
        });
      }
    }

    const id = this.cryptoService.generateUUID();

    const clienteData = {
      id,
      nombre,
      email,
      ...(telefono && { telefono }),
      empresa_id: empresaId
    };

    return this.clienteRepository.create(clienteData);
  }
}
