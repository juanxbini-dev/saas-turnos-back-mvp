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
  // 'pendientes' pisa metodo_pago: lista solo entradas con metodo_pago = 'pendiente'
  tipo: 'todos' | 'turnos' | 'productos' | 'pendientes';
  metodo_pago: 'todos' | 'efectivo' | 'transferencia' | 'pendiente' | 'canje';
  estado_comision: 'todos' | 'pendiente' | 'pagada' | 'cancelada';
  ordenar_por: 'fecha' | 'total_venta' | 'total_neto_profesional';
  orden: 'asc' | 'desc';
  pagina: number;
  por_pagina: number;
}

export interface FinanzasSummary {
  total_venta: number;
  total_venta_servicios: number;
  total_venta_productos: number;
  total_comision_empresa: number;
  total_comision_empresa_servicios: number;
  total_comision_empresa_productos: number;
  total_neto_profesional: number;
  total_neto_profesional_servicios: number;
  total_neto_profesional_productos: number;
  total_descuentos: number;
  cantidad_turnos: number;
  cantidad_productos_vendidos: number;
  promedio_por_turno: number;
  total_pendiente: number;
  // Canjes: entregas gratis (importes 0). No suman a los totales; se cuentan aparte.
  cantidad_canjes_servicios: number;
  cantidad_canjes_productos: number;
}

// Item individual dentro de una venta agrupada
export interface VentaItemFinanzas {
  id: string;
  nombre_producto: string;
  cantidad: number;
  precio_total: number;
  comision_porcentaje: number;
  comision_monto: number;
  neto_vendedor: number;
}

// Venta de producto agrupada por transacción (venta_grupo_id)
export interface VentaGrupadaFinanzas {
  tipo: 'venta_producto';
  id: string;
  venta_grupo_id: string;
  turno_id: string | null;
  fecha: string;
  metodo_pago: string;
  total: number;
  comision_monto: number;
  neto_vendedor: number;
  cliente_nombre: string | null;
  vendedor_nombre: string;
  empresa_id: string;
  // Detalle del canje (solo cuando metodo_pago = 'canje'; NULL en caso contrario)
  canje_detalle?: string | null;
  items: VentaItemFinanzas[];
}

// Para el JOIN con datos del turno
export interface ComisionConDetalle extends ComisionProfesional {
  tipo: 'turno';
  turno_fecha: string;
  turno_hora: string;
  turno_estado: string;
  metodo_pago: 'efectivo' | 'transferencia' | 'pendiente' | 'canje';
  precio_original: number;
  descuento_porcentaje: number;
  descuento_monto: number;
  total_final: number;
  cliente_nombre: string;
  servicio_nombre: string;
  profesional_nombre?: string;
  tiene_productos: boolean;
  // El turno tiene productos con metodo_pago = 'pendiente' (aunque no estén en la página actual)
  tiene_producto_pendiente: boolean;
  // Detalle del canje (turnos.canje_detalle; solo cuando el servicio se cobró como canje)
  canje_detalle?: string | null;
}

export type EntradaFinanzas = ComisionConDetalle | VentaGrupadaFinanzas;

export interface FinanzasResponse {
  items: EntradaFinanzas[];
  summary: FinanzasSummary;
  total: number;
  pagina: number;
  por_pagina: number;
  total_paginas: number;
}
