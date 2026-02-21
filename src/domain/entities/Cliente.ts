export interface Cliente {
  id: string
  nombre: string
  email: string
  telefono: string | null
  empresa_id: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface CreateClienteData {
  id: string
  nombre: string
  email: string
  telefono?: string
  empresa_id: string
}

export interface UpdateClienteData {
  nombre?: string
  email?: string
  telefono?: string | null
}
