export interface BloqueoSlot {
  id: string;
  empresa_id: string;
  profesional_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo: string | null;
  created_at: string;
}

export interface CreateBloqueoSlotData {
  id: string;
  empresa_id: string;
  profesional_id: string;
  fecha: string;
  hora_inicio: string;
  hora_fin: string;
  motivo?: string;
}
