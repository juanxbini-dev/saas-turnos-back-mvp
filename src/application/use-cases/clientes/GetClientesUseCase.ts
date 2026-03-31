import { IClienteRepository, ClientesPaginados } from '../../../domain/repositories/IClienteRepository';

export class GetClientesUseCase {
  constructor(private clienteRepository: IClienteRepository) {}

  async execute(empresaId: string, pagina: number, porPagina: number, busqueda?: string): Promise<ClientesPaginados> {
    return this.clienteRepository.findByEmpresaPaginado(empresaId, pagina, porPagina, busqueda);
  }
}
