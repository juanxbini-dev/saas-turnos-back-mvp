export interface Producto {
  id: string;
  empresa_id: string;
  nombre: string;
  descripcion: string | null;
  // Precio NULL en DB = derivado de la configuración (costo × (1 + pct/100));
  // valor cargado = override manual. Los flags *_manual los completa el use case.
  precio_efectivo: number | null;
  precio_transferencia: number | null;
  precio_tarjeta: number | null;
  precio_efectivo_manual?: boolean;
  precio_transferencia_manual?: boolean;
  precio_tarjeta_manual?: boolean;
  costo: number | null;
  stock: number;
  activo: boolean;
  marca_id: string | null;
  marca_nombre: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateProductoData {
  nombre: string;
  descripcion?: string;
  precio_efectivo?: number | null;
  precio_transferencia?: number | null;
  precio_tarjeta?: number | null;
  costo: number;
  stock: number;
  empresa_id: string;
  marca_id?: string | null;
}

export interface UpdateProductoData {
  nombre?: string;
  descripcion?: string;
  precio_efectivo?: number | null;
  precio_transferencia?: number | null;
  precio_tarjeta?: number | null;
  costo?: number;
  stock?: number;
  activo?: boolean;
  marca_id?: string | null;
}

export interface ProductoVentaFinanzas {
  producto_id: string;
  nombre: string;
  precio_efectivo: number | null;
  precio_transferencia: number | null;
  costo: number | null;
  total_unidades: number;
  unidades_efectivo: number;
  unidades_transferencia: number;
  unidades_pendiente: number;
  total_efectivo: number;
  total_transferencia: number;
  total_pendiente: number;
  total_comision: number;
  total_neto_vendedor: number;
}

export interface TopProducto {
  producto_id: string;
  nombre: string;
  total_vendido: number;
  total_ingresos: number;
}

export interface TopVendedor {
  vendedor_id: string;
  nombre: string;
  total_vendido: number;
  total_ingresos: number;
}

export interface ProductosStats {
  top_productos: TopProducto[];
  top_vendedores: TopVendedor[];
  bajo_stock_count: number;
}
