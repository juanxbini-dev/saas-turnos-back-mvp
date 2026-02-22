import { IClienteRepository } from '../../../domain/repositories/IClienteRepository';
import { Cliente } from '../../../domain/entities/Cliente';

export interface GetMisClientesRequest {
  usuarioId: string;
  empresaId: string;
}

export class GetMisClientesUseCase {
  constructor(private clienteRepository: IClienteRepository) {}

  async execute(request: GetMisClientesRequest): Promise<Cliente[]> {
    const { usuarioId, empresaId } = request;
    
    console.log('🔍 [GetMisClientesUseCase] Obteniendo clientes para profesional:', {
      usuarioId,
      empresaId
    });

    const clientes = await this.clienteRepository.findByProfesional(usuarioId, empresaId);
    
    console.log('🔍 [GetMisClientesUseCase] Clientes encontrados:', clientes.length);
    
    return clientes;
  }
}
