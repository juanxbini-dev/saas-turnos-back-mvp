import { IMetricasRepository } from '../../../domain/repositories/IMetricasRepository';
import {
  MetricasPeriodo,
  MetricasResumen,
  MetricasAgrupacion,
  MetricasEvolucionPunto,
  MetricasEquipoItem,
  MetricasClientesNuevos,
  MetricasComparativaItem,
} from '../../../domain/entities/Metricas';

export class GetMetricasResumenUseCase {
  constructor(private metricasRepository: IMetricasRepository) {}

  async execute(empresaId: string, periodo: MetricasPeriodo): Promise<MetricasResumen> {
    return this.metricasRepository.getResumen(empresaId, periodo);
  }
}

export class GetMetricasEvolucionUseCase {
  constructor(private metricasRepository: IMetricasRepository) {}

  async execute(
    empresaId: string,
    periodo: MetricasPeriodo,
    agrupar: MetricasAgrupacion
  ): Promise<MetricasEvolucionPunto[]> {
    return this.metricasRepository.getEvolucion(empresaId, periodo, agrupar);
  }
}

export class GetMetricasEquipoUseCase {
  constructor(private metricasRepository: IMetricasRepository) {}

  async execute(empresaId: string, periodo: MetricasPeriodo): Promise<MetricasEquipoItem[]> {
    return this.metricasRepository.getEquipo(empresaId, periodo);
  }
}

export class GetMetricasClientesNuevosUseCase {
  constructor(private metricasRepository: IMetricasRepository) {}

  async execute(empresaId: string, periodo: MetricasPeriodo): Promise<MetricasClientesNuevos> {
    return this.metricasRepository.getClientesNuevos(empresaId, periodo);
  }
}

export class GetMetricasComparativaUseCase {
  constructor(private metricasRepository: IMetricasRepository) {}

  async execute(
    empresaId: string,
    periodo: MetricasPeriodo,
    agrupar: MetricasAgrupacion
  ): Promise<MetricasComparativaItem[]> {
    return this.metricasRepository.getComparativa(empresaId, periodo, agrupar);
  }
}
