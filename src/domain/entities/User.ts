export type UsuarioRol = 'admin' | 'staff';

export interface User {
  id: string;
  email: string;
  password: string;
  nombre: string;
  username: string;
  empresa_id: string;
  roles: string[];
  activo: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
  tenant?: string;
  empresa_activa?: boolean;
}

export interface UsuarioPublico {
  id: string;
  email: string;
  nombre: string;
  username: string;
  empresa_id: string;
  roles: string[];
  activo: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}
