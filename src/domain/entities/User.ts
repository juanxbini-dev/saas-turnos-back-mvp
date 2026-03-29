export type UsuarioRol = 'admin' | 'staff' | 'super_admin';

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
  avatar_url?: string | null;
  avatar_public_id?: string | null;
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
  comision_turno?: number;
  comision_producto?: number;
  avatar_url?: string | null;
}
