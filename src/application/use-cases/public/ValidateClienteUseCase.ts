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
    email: string;
    telefono?: string;
  };
}

export class ValidateClienteUseCase {
  constructor(private clienteRepository: IClienteRepository) {}

  async execute(request: ValidateClienteRequest): Promise<ValidateClienteResponse> {
    const { email, telefono, nombre, empresa_id } = request;

    if (!email && !telefono && !nombre) {
      return { exists: false };
    }

    // Buscar cliente por email, teléfono o nombre (con al menos uno provisto)
    const cliente = await this.clienteRepository.findByEmailOrTelefono(email, empresa_id, telefono, nombre);
    

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
