import { VentaProducto, CreateVentaProductoData } from '../entities/Comision';

export interface ResumenProfesional {
  vendedor_id: string;
  nombre: string;
  comision_producto: number;
  total_ventas: number;
  costo_total: number;
  ganancia_bruta: number;
  ganancia_profesional: number;
  ganancia_empresa: number;
}

export interface ResumenTotalesVentas {
  total_ventas: number;
  costo_total: number;
  ganancia_bruta: number;
  ganancia_profesionales: number;
  ganancia_empresa: number;
}

export interface ResumenProducto {
  producto_id: string | null;
  nombre_producto: string;
  cantidad_total: number;
  total_ventas: number;
  costo_total: number;
  ganancia_bruta: number;
}

export interface VentaProductoFiltros {
  fechaDesde: string;
  fechaHasta: string;
  vendedor_id?: string;
  page: number;
  limit: number;
}

export interface VentaProductoConVendedor extends VentaProducto {
  vendedor_nombre: string;
  cliente_nombre: string | null;
}

export interface UpdateVentaProductoData {
  vendedor_id?: string;
  nombre_producto?: string;
  cantidad?: number;
  precio_unitario?: number;
  precio_total?: number;
  metodo_pago?: string;
  fecha_venta?: string;
  es_venta_costo?: boolean;
  costo_unitario_snapshot?: number | null;
}

export interface IVentaProductoRepository {
  create(data: CreateVentaProductoData): Promise<VentaProducto>;
  findByTurno(turnoId: string): Promise<VentaProducto[]>;
  deleteByTurno(turnoId: string): Promise<void>;
  findByVendedor(vendedorId: string, empresaId: string, fechaDesde: string, fechaHasta: string): Promise<VentaProducto[]>;
  findAllPaginated(empresaId: string, params: VentaProductoFiltros): Promise<{ rows: VentaProductoConVendedor[], total: number }>;
  updateById(id: string, empresaId: string, data: UpdateVentaProductoData): Promise<VentaProducto>;
  deleteById(id: string, empresaId: string): Promise<void>;
  getResumen(empresaId: string, fechaDesde: string, fechaHasta: string, vendedorId?: string): Promise<{ totales: ResumenTotalesVentas; por_profesional: ResumenProfesional[]; por_producto: ResumenProducto[] }>;
}
