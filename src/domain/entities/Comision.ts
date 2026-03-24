export interface ComisionTurno {
  id: string;
  turno_id: string;
  profesional_id: string;
  empresa_id: string;
  servicio_monto: number;
  servicio_comision_porcentaje: number;
  servicio_comision_monto: number;
  servicio_neto_profesional: number;
  estado: ComisionEstado;
  fecha_pago?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
}

export type ComisionEstado = 'pendiente' | 'pagada' | 'cancelada';

export interface CreateComisionData {
  turno_id: string;
  profesional_id: string;
  empresa_id: string;
  servicio_monto: number;
  servicio_comision_porcentaje: number;
  servicio_comision_monto: number;
  servicio_neto_profesional: number;
}

export interface VentaProducto {
  id: string;
  empresa_id: string;
  vendedor_id: string;
  cliente_id: string | null;
  turno_id: string | null;
  venta_grupo_id: string | null;
  producto_id: string | null;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  metodo_pago: string | null;
  comision_porcentaje: number;
  comision_monto: number;
  neto_vendedor: number;
  created_at: string;
  updated_at: string;
}

export interface CreateVentaProductoData {
  empresa_id: string;
  vendedor_id: string;
  cliente_id?: string | null;
  turno_id?: string | null;
  venta_grupo_id?: string | null;
  producto_id?: string | null;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  metodo_pago?: string | null;
  comision_porcentaje: number;
  comision_monto: number;
  neto_vendedor: number;
}
