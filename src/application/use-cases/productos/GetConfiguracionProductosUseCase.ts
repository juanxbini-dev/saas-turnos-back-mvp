import { IConfiguracionProductosRepository } from '../../../domain/repositories/IConfiguracionProductosRepository';
import { ConfiguracionProductos, CONFIGURACION_PRODUCTOS_DEFAULT } from '../../../domain/entities/ConfiguracionProductos';

export class GetConfiguracionProductosUseCase {
  constructor(private configRepository: IConfiguracionProductosRepository) {}

  async execute(empresaId: string): Promise<ConfiguracionProductos> {
    const config = await this.configRepository.findByEmpresa(empresaId);
    return config ?? { empresa_id: empresaId, ...CONFIGURACION_PRODUCTOS_DEFAULT };
  }
}
