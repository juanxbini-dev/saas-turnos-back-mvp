export interface DisponibilidadSemanal {
  id: string;
  profesional_id: string;
  dia_inicio: number;
  dia_fin: number;
  hora_inicio: string;
  hora_fin: string;
  intervalo_minutos: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface DiasVacacion {
  id: string;
  profesional_id: string;
  fecha: string;
  fecha_fin: string | null;
  tipo: 'vacacion' | 'feriado' | 'personal' | 'enfermedad';
  motivo: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExcepcionDia {
  id: string;
  profesional_id: string;
  fecha: string;
  disponible: boolean;
  tipo: 'reemplazo' | 'adicional';
  hora_inicio: string | null;
  hora_fin: string | null;
  intervalo_minutos: number | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateDisponibilidadData {
  id: string;
  profesional_id: string;
  dia_inicio: number;
  dia_fin: number;
  hora_inicio: string;
  hora_fin: string;
  intervalo_minutos: number;
}

export interface UpdateDisponibilidadData {
  dia_inicio?: number;
  dia_fin?: number;
  hora_inicio?: string;
  hora_fin?: string;
  intervalo_minutos?: number;
  activo?: boolean;
}

export interface CreateVacacionData {
  id: string;
  profesional_id: string;
  fecha: string;
  fecha_fin?: string;
  tipo: 'vacacion' | 'feriado' | 'personal' | 'enfermedad';
  motivo?: string;
}

export interface UpdateVacacionData {
  fecha?: string;
  fecha_fin?: string;
  tipo?: 'vacacion' | 'feriado' | 'personal' | 'enfermedad';
  motivo?: string;
}

export interface CreateExcepcionData {
  id: string;
  profesional_id: string;
  fecha: string;
  disponible: boolean;
  tipo?: 'reemplazo' | 'adicional';
  hora_inicio?: string;
  hora_fin?: string;
  intervalo_minutos?: number;
  notas?: string;
}

export interface UpdateExcepcionData {
  fecha?: string;
  disponible?: boolean;
  tipo?: 'reemplazo' | 'adicional';
  hora_inicio?: string;
  hora_fin?: string;
  intervalo_minutos?: number;
  notas?: string;
}
