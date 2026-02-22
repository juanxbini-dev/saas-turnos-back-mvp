export interface Servicio {
  id: string
  nombre: string
  descripcion: string | null
  duracion: number
  precio_base: number | null
  precio_minimo: number | null
  precio_maximo: number | null
  empresa_id: string
  activo: boolean
  created_at: string
  updated_at: string
}

export interface UsuarioServicio {
  id: string
  usuario_id: string
  servicio_id: string
  empresa_id: string
  precio_personalizado: number | null
  duracion_personalizada: number | null
  habilitado: boolean
  nivel_habilidad: string | null
  notas: string | null
  created_at: string
  updated_at: string
  // Campos del JOIN con servicios (sin alias)
  nombre: string
  descripcion: string | null
  precio: number | null
  duracion_minutos: number
}
