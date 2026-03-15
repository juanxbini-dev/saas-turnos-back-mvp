export interface Producto {
  id: string;
  empresa_id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  stock: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateProductoData {
  nombre: string;
  descripcion?: string;
  precio: number;
  stock: number;
  empresa_id: string;
}

export interface UpdateProductoData {
  nombre?: string;
  descripcion?: string;
  precio?: number;
  activo?: boolean;
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
