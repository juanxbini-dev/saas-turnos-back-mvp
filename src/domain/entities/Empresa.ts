export interface Empresa {
  id: string;
  nombre: string;
  dominio: string;
  activo: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateEmpresaData {
  id: string;
  nombre: string;
  dominio: string;
  activo: boolean;
}

export interface UpdateEmpresaData {
  nombre?: string;
  dominio?: string;
  activo?: boolean;
}
