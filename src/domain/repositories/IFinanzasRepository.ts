import { ComisionProfesional, FinanzasFilters, FinanzasSummary, ComisionConDetalle } from '../../domain/entities/Finanzas';

export interface IFinanzasRepository {
  // Obtener comisiones con filtros
  getComisionesByProfesional(
    profesionalId: string,
    empresaId: string,
    filters: FinanzasFilters
  ): Promise<{ data: ComisionConDetalle[]; total: number }>;

  // Obtener resumen de finanzas
  getFinanzasSummary(
    profesionalId: string,
    empresaId: string,
    filters: FinanzasFilters
  ): Promise<FinanzasSummary>;
}
