import { Producto, CreateProductoData, UpdateProductoData, TopProducto, TopVendedor, ProductoVentaFinanzas } from '../entities/Producto';

export interface IProductoRepository {
  findAll(empresaId: string): Promise<Producto[]>;
  findById(id: string): Promise<Producto | null>;
  create(data: CreateProductoData): Promise<Producto>;
  update(id: string, data: UpdateProductoData): Promise<Producto>;
  addStock(id: string, cantidad: number): Promise<Producto>;
  deductStock(id: string, cantidad: number): Promise<Producto>;
  delete(id: string): Promise<void>;
  findByNombre(empresaId: string, nombre: string, excludeId?: string): Promise<Producto | null>;
  // Limpia los overrides de precio (los vuelve NULL = derivados de la config) de los
  // productos con costo cargado. Devuelve cuántos se actualizaron.
  resetPreciosManuales(empresaId: string): Promise<number>;
  countManualesSinCosto(empresaId: string): Promise<number>;
  findBajoStock(empresaId: string, umbral?: number): Promise<Producto[]>;
  getTopVendidos(empresaId: string, limit?: number): Promise<TopProducto[]>;
  getTopVendedores(empresaId: string, limit?: number): Promise<TopVendedor[]>;
  getVentasFinanzas(empresaId: string, fechaDesde?: string, fechaHasta?: string): Promise<ProductoVentaFinanzas[]>;
}
