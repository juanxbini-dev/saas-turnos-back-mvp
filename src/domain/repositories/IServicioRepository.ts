import { Servicio } from '../entities/Servicio';

export interface CreateServicioData {
  id?: string;
  nombre: string;
  descripcion?: string;
  duracion: number;
  precio_base?: number;
  precio_minimo?: number;
  precio_maximo?: number;
  empresa_id: string;
}

export interface UpdateServicioData extends Partial<Omit<CreateServicioData, 'id' | 'empresa_id'>> {}

export interface IServicioRepository {
  findByEmpresa(empresaId: string): Promise<Servicio[]>;
  findById(id: string): Promise<Servicio | null>;
  create(data: CreateServicioData): Promise<Servicio>;
  update(id: string, data: UpdateServicioData): Promise<Servicio>;
  toggleActivo(id: string, activo: boolean): Promise<Servicio>;
  delete(id: string): Promise<void>;
}
