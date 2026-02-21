import { UsuarioPublico, User } from '../entities/User';

export interface CreateUsuarioData {
  id?: string;
  nombre: string;
  username: string;
  password: string;
  email: string;
  empresa_id: string;
  rol: 'admin' | 'staff';
}

export interface UpdateDatosData {
  nombre: string;
  username: string;
}

export interface IUsuarioRepository {
  findByEmpresa(empresaId: string): Promise<UsuarioPublico[]>;
  findById(id: string): Promise<UsuarioPublico | null>;
  findByIdWithPassword(id: string): Promise<User | null>;
  create(data: CreateUsuarioData): Promise<UsuarioPublico>;
  updateDatos(id: string, data: UpdateDatosData): Promise<UsuarioPublico>;
  updatePassword(id: string, hashedPassword: string): Promise<void>;
  updateRol(id: string, roles: string[]): Promise<UsuarioPublico>;
  toggleActivo(id: string, activo: boolean): Promise<UsuarioPublico>;
  existeUsername(username: string, empresaId: string, excludeId?: string): Promise<boolean>;
}
