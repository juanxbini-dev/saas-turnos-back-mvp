import { FinanzasFilters, FinanzasSummary, ComisionConDetalle, VentaDirectaFinanzas } from '../../domain/entities/Finanzas';

export interface IFinanzasRepository {
  getComisionesByProfesional(
    profesionalId: string,
    empresaId: string,
    filters: FinanzasFilters
  ): Promise<{ data: ComisionConDetalle[]; total: number }>;

  getFinanzasSummary(
    profesionalId: string,
    empresaId: string,
    filters: FinanzasFilters
  ): Promise<FinanzasSummary>;

  getVentasDirectas(
    vendedorId: string,
    empresaId: string,
    filters: FinanzasFilters
  ): Promise<{ data: VentaDirectaFinanzas[]; total: number }>;

  cobrarPago(
    tipo: 'turno' | 'venta',
    id: string,
    empresaId: string,
    metodoPago: 'efectivo' | 'transferencia'
  ): Promise<void>;
}
