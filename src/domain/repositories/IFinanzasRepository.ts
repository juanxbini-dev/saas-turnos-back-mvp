import { FinanzasFilters, FinanzasSummary, EntradaFinanzas } from '../../domain/entities/Finanzas';

export interface IFinanzasRepository {
  getEntradasPaginadas(
    profesionalId: string,
    empresaId: string,
    filters: FinanzasFilters
  ): Promise<{ items: EntradaFinanzas[]; total: number }>;

  getFinanzasSummary(
    profesionalId: string,
    empresaId: string,
    filters: FinanzasFilters
  ): Promise<FinanzasSummary>;

  cobrarPago(
    tipo: 'turno' | 'venta',
    id: string,
    empresaId: string,
    metodoPago: 'efectivo' | 'transferencia'
  ): Promise<void>;
}
