import { Producto, CreateProductoData, UpdateProductoData, TopProducto, TopVendedor } from '../entities/Producto';

export interface IProductoRepository {
  findAll(empresaId: string): Promise<Producto[]>;
  findById(id: string): Promise<Producto | null>;
  create(data: CreateProductoData): Promise<Producto>;
  update(id: string, data: UpdateProductoData): Promise<Producto>;
  addStock(id: string, cantidad: number): Promise<Producto>;
  deductStock(id: string, cantidad: number): Promise<Producto>;
  delete(id: string): Promise<void>;
  findByNombre(empresaId: string, nombre: string, excludeId?: string): Promise<Producto | null>;
  findBajoStock(empresaId: string, umbral?: number): Promise<Producto[]>;
  getTopVendidos(empresaId: string, limit?: number): Promise<TopProducto[]>;
  getTopVendedores(empresaId: string, limit?: number): Promise<TopVendedor[]>;
}
