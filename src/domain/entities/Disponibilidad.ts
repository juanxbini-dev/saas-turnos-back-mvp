export interface DisponibilidadSemanal {
  id: string;
  profesional_id: string;
  dia_inicio: number;
  dia_fin: number;
  hora_inicio: string;
  hora_fin: string;
  intervalo_minutos: number;
  activo: boolean;
  empresa_id: string;
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
  empresa_id: string;
  created_at: string;
  updated_at: string;
}

export interface ExcepcionDia {
  id: string;
  profesional_id: string;
  fecha: string;
  disponible: boolean;
  hora_inicio: string | null;
  hora_fin: string | null;
  intervalo_minutos: number | null;
  notas: string | null;
  empresa_id: string;
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
  empresa_id: string;
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
  empresa_id: string;
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
  hora_inicio?: string;
  hora_fin?: string;
  intervalo_minutos?: number;
  notas?: string;
  empresa_id: string;
}

export interface UpdateExcepcionData {
  fecha?: string;
  disponible?: boolean;
  hora_inicio?: string;
  hora_fin?: string;
  intervalo_minutos?: number;
  notas?: string;
}
