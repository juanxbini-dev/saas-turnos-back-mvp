import { IClienteRepository } from '../../../domain/repositories/IClienteRepository';

export interface ValidateClienteRequest {
  email: string;
  telefono?: string;
  empresa_id: string;
}

export interface ValidateClienteResponse {
  exists: boolean;
  cliente?: {
    id: string;
    nombre: string;
    email: string;
    telefono?: string;
  };
}

export class ValidateClienteUseCase {
  constructor(private clienteRepository: IClienteRepository) {}

  async execute(request: ValidateClienteRequest): Promise<ValidateClienteResponse> {
    const { email, telefono, empresa_id } = request;


    // Buscar cliente por email o teléfono usando el método correcto
    const cliente = await this.clienteRepository.findByEmailOrTelefono(email, empresa_id, telefono);
    

    if (!cliente) {
      return { exists: false };
    }

    // Por ahora, retornamos datos básicos del cliente
    const clienteData: ValidateClienteResponse['cliente'] = {
      id: cliente.id,
      nombre: cliente.nombre,
      email: cliente.email
    };

    // Solo agregar teléfono si existe
    if (cliente.telefono) {
      clienteData.telefono = cliente.telefono;
    }


    return {
      exists: true,
      cliente: clienteData
    };
  }
}
