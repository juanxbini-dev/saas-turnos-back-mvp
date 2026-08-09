import {
  MetricasPeriodo,
  MetricasResumen,
  MetricasAgrupacion,
  MetricasEvolucionPunto,
  MetricasEquipoItem,
  MetricasClientesNuevos,
  MetricasComparativaItem,
} from '../entities/Metricas';

export interface IMetricasRepository {
  getResumen(empresaId: string, periodo: MetricasPeriodo): Promise<MetricasResumen>;

  getEvolucion(
    empresaId: string,
    periodo: MetricasPeriodo,
    agrupar: MetricasAgrupacion
  ): Promise<MetricasEvolucionPunto[]>;

  getEquipo(empresaId: string, periodo: MetricasPeriodo): Promise<MetricasEquipoItem[]>;

  getClientesNuevos(empresaId: string, periodo: MetricasPeriodo): Promise<MetricasClientesNuevos>;

  getComparativa(
    empresaId: string,
    periodo: MetricasPeriodo,
    agrupar: MetricasAgrupacion
  ): Promise<MetricasComparativaItem[]>;
}
