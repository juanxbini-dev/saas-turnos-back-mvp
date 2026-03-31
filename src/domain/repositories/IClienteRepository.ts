import { Cliente, CreateClienteData, UpdateClienteData } from '../entities/Cliente';

export { CreateClienteData, UpdateClienteData };

export interface ClientesPaginados {
  items: Cliente[];
  total: number;
}

export interface IClienteRepository {
  findByEmpresa(empresaId: string): Promise<Cliente[]>
  findByEmpresaPaginado(empresaId: string, pagina: number, porPagina: number, busqueda?: string): Promise<ClientesPaginados>
  findByProfesional(profesionalId: string, empresaId: string): Promise<Cliente[]>
  findById(id: string): Promise<Cliente | null>
  create(data: CreateClienteData): Promise<Cliente>
  update(id: string, data: UpdateClienteData): Promise<Cliente>
  toggleActivo(id: string, activo: boolean): Promise<Cliente>
  existeEmail(email: string, empresaId: string, excludeId?: string): Promise<boolean>
  existeTelefono(telefono: string, empresaId: string, excludeId?: string): Promise<boolean>
  findByEmailOrTelefono(email: string, empresaId: string, telefono?: string): Promise<Cliente | null>
  getTurnosCount(clienteId: string): Promise<number>
}
