import { Cliente, CreateClienteData, UpdateClienteData, TurnoResumen, ProductoComprado } from '../entities/Cliente';

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
  delete(id: string): Promise<void>
  existeEmail(email: string, empresaId: string, excludeId?: string): Promise<boolean>
  existeTelefono(telefono: string, empresaId: string, excludeId?: string): Promise<boolean>
  findByEmailOrTelefono(email: string | undefined, empresaId: string, telefono?: string, nombre?: string): Promise<Cliente | null>
  getTurnosCount(clienteId: string): Promise<number>
  getClienteTurnos(clienteId: string, empresaId: string): Promise<TurnoResumen[]>
  getClienteProductos(clienteId: string, empresaId: string): Promise<ProductoComprado[]>
}
