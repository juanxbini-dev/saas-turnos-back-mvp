import { IConfiguracionProductosRepository } from '../../../domain/repositories/IConfiguracionProductosRepository';
import { ConfiguracionProductos, UpdateConfiguracionProductosData } from '../../../domain/entities/ConfiguracionProductos';

export class UpdateConfiguracionProductosUseCase {
  constructor(private configRepository: IConfiguracionProductosRepository) {}

  async execute(empresaId: string, data: UpdateConfiguracionProductosData): Promise<ConfiguracionProductos> {
    for (const [campo, valor] of Object.entries({
      pct_efectivo: data.pct_efectivo,
      pct_transferencia: data.pct_transferencia,
      pct_tarjeta: data.pct_tarjeta,
    })) {
      if (valor == null || Number.isNaN(Number(valor))) {
        throw Object.assign(new Error(`El campo ${campo} es requerido y debe ser numérico`), { statusCode: 400 });
      }
      if (Number(valor) < 0 || Number(valor) > 1000) {
        throw Object.assign(new Error(`El campo ${campo} debe estar entre 0 y 1000`), { statusCode: 400 });
      }
    }

    return this.configRepository.upsert(empresaId, {
      pct_efectivo: Number(data.pct_efectivo),
      pct_transferencia: Number(data.pct_transferencia),
      pct_tarjeta: Number(data.pct_tarjeta),
    });
  }
}
