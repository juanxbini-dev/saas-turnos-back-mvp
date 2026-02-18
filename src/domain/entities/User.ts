export interface User {
  id: string;
  email: string;
  password: string;
  empresa_id: string;
  roles: string[];
  activo: boolean;
  tenant?: string;
  empresa_activa?: boolean;
}
