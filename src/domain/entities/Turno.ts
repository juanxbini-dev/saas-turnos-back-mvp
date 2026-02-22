export type TurnoEstado = 'pendiente' | 'confirmado' | 'completado' | 'cancelado';

export interface Turno {
  id: string;
  cliente_id: string;
  usuario_id: string;
  servicio_id: string;
  fecha: string;
  hora: string;
  estado: TurnoEstado;
  notas: string | null;
  servicio: string;
  precio: number;
  duracion_minutos: number;
  empresa_id: string;
  created_at: string;
  updated_at: string;
}

export interface TurnoConDetalle extends Turno {
  cliente_nombre: string;
  cliente_email: string;
  usuario_nombre: string;
  usuario_username: string;
}

export interface CreateTurnoData {
  id: string;
  cliente_id: string;
  usuario_id: string;
  servicio_id: string;
  fecha: string;
  hora: string;
  notas?: string;
  servicio: string;
  precio: number;
  duracion_minutos: number;
  empresa_id: string;
}
