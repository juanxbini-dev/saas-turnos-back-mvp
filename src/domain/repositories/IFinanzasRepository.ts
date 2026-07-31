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

  // 'tarjeta' solo es válido para productos (tipos venta/venta_turno o metodoPagoProductos).
  // 'canje' vale para servicios y productos: al cobrar como canje se zerean los importes.
  cobrarPago(
    tipo: 'turno' | 'venta',
    id: string,
    empresaId: string,
    metodoPago: 'efectivo' | 'transferencia' | 'tarjeta' | 'canje',
    metodoPagoProductos?: 'efectivo' | 'transferencia' | 'tarjeta' | 'canje'
  ): Promise<void>;
}
