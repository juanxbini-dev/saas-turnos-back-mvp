import { VentaProducto, CreateVentaProductoData } from '../entities/Comision';

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
}
