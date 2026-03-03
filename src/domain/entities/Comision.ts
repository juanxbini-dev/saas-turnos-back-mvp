export interface ComisionProfesional {
  id: string;
  turno_id: string;
  profesional_id: string;
  empresa_id: string;
  
  // Datos del servicio
  servicio_monto: number;
  servicio_comision_porcentaje: number;
  servicio_comision_monto: number;
  servicio_neto_profesional: number;
  
  // Datos de productos
  productos_monto: number;
  productos_comision_porcentaje: number;
  productos_comision_monto: number;
  productos_neto_profesional: number;
  
  // Totales
  total_venta: number;
  total_comision_empresa: number;
  total_neto_profesional: number;
  
  // Estado
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
  productos_monto: number;
  productos_comision_porcentaje: number;
  productos_comision_monto: number;
  productos_neto_profesional: number;
  total_venta: number;
  total_comision_empresa: number;
  total_neto_profesional: number;
}

export interface VentaProducto {
  id: string;
  turno_id: string;
  producto_id?: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  created_at: string;
  updated_at: string;
}

export interface CreateVentaProductoData {
  turno_id: string;
  producto_id?: string | null;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
}
