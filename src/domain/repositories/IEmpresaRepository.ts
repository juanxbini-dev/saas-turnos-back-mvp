import { Empresa, CreateEmpresaData, UpdateEmpresaData } from '../entities/Empresa';

export interface IEmpresaRepository {
  findByDominio(dominio: string): Promise<Empresa | null>;
  findById(id: string): Promise<Empresa | null>;
  findAll(): Promise<Empresa[]>;
  create(data: CreateEmpresaData): Promise<Empresa>;
  update(id: string, data: UpdateEmpresaData): Promise<Empresa>;
  toggleActivo(id: string): Promise<Empresa>;
  existeDominio(dominio: string, excludeId?: string): Promise<boolean>;
}
