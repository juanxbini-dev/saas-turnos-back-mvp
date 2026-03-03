import { VentaProducto, CreateVentaProductoData } from '../entities/Comision';

export interface IVentaProductoRepository {
  create(data: CreateVentaProductoData): Promise<VentaProducto>;
  findByTurno(turnoId: string): Promise<VentaProducto[]>;
  deleteByTurno(turnoId: string): Promise<void>;
}
