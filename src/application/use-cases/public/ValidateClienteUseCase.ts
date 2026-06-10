import { IClienteRepository } from '../../../domain/repositories/IClienteRepository';

export interface ValidateClienteRequest {
  email?: string;
  telefono?: string;
  nombre?: string;
  empresa_id: string;
}

export interface ValidateClienteResponse {
  exists: boolean;
  cliente?: {
    id: string;
    nombre: string;
    email?: string;
    telefono?: string;
  };
}

export class ValidateClienteUseCase {
  constructor(private clienteRepository: IClienteRepository) {}

  async execute(request: ValidateClienteRequest): Promise<ValidateClienteResponse> {
    const { telefono, empresa_id } = request;
    // El email se normaliza (minúsculas + trim) para que el matching sea consistente
    // con el índice UNIQUE(email, empresa_id), que es sensible a mayúsculas.
    const email = request.email?.trim().toLowerCase() || undefined;

    if (!telefono && !email) {
      return { exists: false };
    }

    // Prioridad: teléfono primero, luego email
    let cliente = null;
    if (telefono) {
      cliente = await this.clienteRepository.findByTelefono(telefono, empresa_id);
    }
    if (!cliente && email) {
      cliente = await this.clienteRepository.findByEmail(email, empresa_id);
    }

    if (!cliente) {
      return { exists: false };
    }

    const clienteData: ValidateClienteResponse['cliente'] = {
      id: cliente.id,
      nombre: cliente.nombre
    };

    if (cliente.email) {
      clienteData.email = cliente.email;
    }

    if (cliente.telefono) {
      clienteData.telefono = cliente.telefono;
    }

    return { exists: true, cliente: clienteData };
  }
}
