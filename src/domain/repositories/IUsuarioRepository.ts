import { UsuarioPublico, User } from '../entities/User';

export interface CreateUsuarioData {
  id?: string;
  nombre: string;
  username: string;
  password: string;
  email: string;
  empresa_id: string;
  rol: 'admin' | 'staff';
  comision_turno?: number;
  comision_producto?: number;
}

export interface UpdateDatosData {
  nombre: string;
  username: string;
  email: string;
  comision_turno?: number;
  comision_producto?: number;
}

export interface IUsuarioRepository {
  findByEmpresa(empresaId: string): Promise<UsuarioPublico[]>;
  findById(id: string): Promise<UsuarioPublico | null>;
  findByIdWithPassword(id: string): Promise<User | null>;
  create(data: CreateUsuarioData): Promise<UsuarioPublico>;
  updateDatos(id: string, data: UpdateDatosData): Promise<UsuarioPublico>;
  updatePassword(id: string, hashedPassword: string): Promise<void>;
  updateRol(id: string, roles: string[]): Promise<UsuarioPublico>;
  delete(id: string): Promise<void>;
  existeUsername(username: string, empresaId: string, excludeId?: string): Promise<boolean>;
  existeEmail(email: string, empresaId: string, excludeId?: string): Promise<boolean>;
  findProfesionalesByEmpresa(empresaId: string, params?: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<UsuarioPublico[]>;
  countProfesionalesByEmpresa(empresaId: string, search?: string): Promise<number>;
  updateAvatar(id: string, avatarUrl: string | null, avatarPublicId: string | null): Promise<UsuarioPublico>;
}
