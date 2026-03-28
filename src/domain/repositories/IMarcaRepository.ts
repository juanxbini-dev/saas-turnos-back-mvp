import { Marca, CreateMarcaData, UpdateMarcaData, MarcaConProductos } from '../entities/Marca';

export interface IMarcaRepository {
  findAll(empresaId: string): Promise<MarcaConProductos[]>;
  findById(id: string): Promise<Marca | null>;
  findByNombre(empresaId: string, nombre: string, excludeId?: string): Promise<Marca | null>;
  create(data: CreateMarcaData): Promise<Marca>;
  update(id: string, data: UpdateMarcaData): Promise<Marca>;
  delete(id: string): Promise<void>;
  countProductos(id: string): Promise<number>;
}
