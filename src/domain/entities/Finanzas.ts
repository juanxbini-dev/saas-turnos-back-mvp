// Representa un registro de comisión por turno finalizado
export interface ComisionProfesional {
  id: string;
  turno_id: string;
  profesional_id: string;
  empresa_id: string;
  // Servicio
  servicio_monto: number;
  servicio_comision_porcentaje: number;
  servicio_comision_monto: number;
  servicio_neto_profesional: number;
  // Productos (puede estar vacío, preparado para el futuro)
  productos_monto: number;
  productos_comision_porcentaje: number;
  productos_comision_monto: number;
  productos_neto_profesional: number;
  // Totales
  total_venta: number;
  total_comision_empresa: number;
  total_neto_profesional: number;
  // Estado
  estado: 'pendiente' | 'pagada' | 'cancelada';
  fecha_pago: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
}

export interface FinanzasFilters {
  fecha_desde: string;
  fecha_hasta: string;
  metodo_pago: 'todos' | 'efectivo' | 'transferencia' | 'pendiente';
  estado_comision: 'todos' | 'pendiente' | 'pagada' | 'cancelada';
  ordenar_por: 'fecha' | 'total_venta' | 'total_neto_profesional';
  orden: 'asc' | 'desc';
  pagina: number;
  por_pagina: number;
}

export interface FinanzasSummary {
  total_venta: number;
  total_comision_empresa: number;
  total_neto_profesional: number;
  total_descuentos: number;
  cantidad_turnos: number;
  promedio_por_turno: number;
}

export interface FinanzasResponse {
  data: ComisionProfesional[];
  summary: FinanzasSummary;
  total: number;
  pagina: number;
  por_pagina: number;
  total_paginas: number;
}

// Para el JOIN con datos del turno
export interface ComisionConDetalle extends ComisionProfesional {
  turno_fecha: string;
  turno_hora: string;
  turno_estado: string;
  metodo_pago: 'efectivo' | 'transferencia' | 'pendiente';
  precio_original: number;
  descuento_porcentaje: number;
  descuento_monto: number;
  total_final: number;
  cliente_nombre: string;
  servicio_nombre: string;
  profesional_nombre?: string;
}
