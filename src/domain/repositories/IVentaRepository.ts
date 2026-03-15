import { Venta, CreateVentaData } from '../entities/Venta';

export interface IVentaRepository {
  create(data: CreateVentaData): Promise<Venta>;
  findAll(empresaId: string): Promise<Venta[]>;
}
