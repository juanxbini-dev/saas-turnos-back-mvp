export type TurnoEstado = 'pendiente' | 'confirmado' | 'completado' | 'cancelado';
// 'tarjeta' solo se usa para venta de productos (el frontend no lo ofrece al cobrar turnos).
// 'canje' vale para servicios y productos: se guarda el detalle pero con todos los importes en 0.
export type MetodoPago = 'efectivo' | 'transferencia' | 'tarjeta' | 'pendiente' | 'canje';

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
  // Nuevos campos financieros
  metodo_pago?: MetodoPago;
  precio_original?: number;
  descuento_porcentaje?: number;
  descuento_monto?: number;
  total_final?: number;
  finalizado_at?: string;
  finalizado_por_id?: string;
  // Origen del turno
  origen?: 'web' | 'interno';
  // Notificaciones
  confirmacion_whatsapp_enviada?: boolean;
  recordatorio_enviado?: boolean;
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
  origen?: 'web' | 'interno';
}

export interface DescuentoAplicarA {
  servicio: boolean;
  productos: boolean;
}

export interface FinalizarTurnoData {
  turnoId: string;
  profesionalId: string;
  empresaId: string;
  metodoPago: MetodoPago;
  precioModificado?: number;
  descuentoPorcentaje?: number;
  descuentoAplicarA?: DescuentoAplicarA;
  productos?: VentaProductoData[];
  precio_original?: number;
  descuento_monto?: number;
  total_final?: number;
  finalizado_at?: string;
  finalizado_por_id?: string;
}

export interface EditarPagoData {
  turnoId: string;
  profesionalId: string;
  empresaId: string;
  metodoPago: MetodoPago;
  precioModificado?: number;
  descuentoPorcentaje?: number;
  descuentoAplicarA?: DescuentoAplicarA;
  productos?: VentaProductoData[];
}

export interface VentaProductoData {
  id: string;
  producto_id?: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  metodo_pago?: 'efectivo' | 'transferencia' | 'tarjeta' | 'pendiente' | 'canje';
  es_venta_costo?: boolean;
}

export interface ComisionesCalculadas {
  servicio: {
    monto: number;
    comisionPorcentaje: number;
    comisionMonto: number;
    netoProfesional: number;
  };
  productos: {
    monto: number;
    comisionPorcentaje: number;
    comisionMonto: number;
    netoProfesional: number;
  };
  totales: {
    totalRecaudado: number;
    totalComisionEmpresa: number;
    totalNetoProfesional: number;
  };
}

export interface CalculoCompletoTurno {
  precioOriginalServicio: number;
  precioOriginalProductos: number;
  subtotalOriginal: number;
  descuentoPorcentaje: number;
  descuentoMonto: number;
  totalConDescuento: number;
  comisionServicio: {
    base: number;
    porcentajeEmpresa: number;
    montoEmpresa: number;
    netoProfesional: number;
  };
  comisionProductos: {
    base: number;
    porcentajeEmpresa: number;
    montoEmpresa: number;
    netoProfesional: number;
  };
  totales: {
    totalRecaudado: number;
    totalEmpresa: number;
    totalProfesional: number;
  };
}
