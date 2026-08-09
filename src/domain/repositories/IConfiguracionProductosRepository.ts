import { ConfiguracionProductos, UpdateConfiguracionProductosData } from '../entities/ConfiguracionProductos';

export interface IConfiguracionProductosRepository {
  findByEmpresa(empresaId: string): Promise<ConfiguracionProductos | null>;
  upsert(empresaId: string, data: UpdateConfiguracionProductosData): Promise<ConfiguracionProductos>;
}
