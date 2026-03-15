import { MetodoPago } from './Turno';

export interface VentaItem {
  id: string;
  venta_id: string;
  producto_id: string;
  nombre_producto: string;
  cantidad: number;
  precio_unitario: number;
  precio_total: number;
  created_at: string;
}

export interface Venta {
  id: string;
  empresa_id: string;
  cliente_id: string | null;
  vendedor_id: string;
  metodo_pago: MetodoPago;
  total: number;
  notas: string | null;
  created_at: string;
  updated_at: string;
  // JOINs opcionales
  cliente_nombre?: string;
  vendedor_nombre?: string;
  items?: VentaItem[];
}

export interface CreateVentaItemData {
  producto_id: string;
  cantidad: number;
  precio_unitario: number;
}

export interface CreateVentaData {
  empresa_id: string;
  cliente_id?: string | null;
  vendedor_id: string;
  metodo_pago: MetodoPago;
  notas?: string;
  items: CreateVentaItemData[];
}
