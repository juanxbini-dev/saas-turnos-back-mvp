import {
  MetricasPeriodo,
  MetricasResumen,
  MetricasAgrupacion,
  MetricasEvolucionPunto,
  MetricasEquipoItem,
} from '../entities/Metricas';

export interface IMetricasRepository {
  getResumen(empresaId: string, periodo: MetricasPeriodo): Promise<MetricasResumen>;

  getEvolucion(
    empresaId: string,
    periodo: MetricasPeriodo,
    agrupar: MetricasAgrupacion
  ): Promise<MetricasEvolucionPunto[]>;

  getEquipo(empresaId: string, periodo: MetricasPeriodo): Promise<MetricasEquipoItem[]>;
}
