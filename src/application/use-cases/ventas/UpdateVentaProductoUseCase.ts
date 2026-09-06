import { IVentaProductoRepository, UpdateVentaProductoData } from '../../../domain/repositories/IVentaProductoRepository';
import { VentaProducto } from '../../../domain/entities/Comision';
import { normalizarCanjeDetalle } from '../../../shared/utils/canje.utils';

export class UpdateVentaProductoUseCase {
  constructor(private repo: IVentaProductoRepository) {}

  async execute(id: string, empresaId: string, data: UpdateVentaProductoData): Promise<VentaProducto> {
    // Input de fecha vacío en HTML llega como '': se trata como "no tocar la fecha"
    // (''::date revienta en Postgres; la fecha existente no puede volver a NULL).
    if (data.fecha_venta === '') {
      const { fecha_venta: _vacia, ...sinFecha } = data;
      data = sinFecha;
    }
    // Canje = entrega gratis: al pasar a canje se fuerzan todos los importes en 0
    // y se guarda el detalle del canje (normalizado).
    // (El cambio DE canje a otro método es pass-through en precios: los manda el frontend;
    //  el canje_detalle vuelve a NULL.)
    let dataFinal: UpdateVentaProductoData;
    if (data.metodo_pago === 'canje') {
      dataFinal = {
        ...data,
        precio_unitario: 0, precio_total: 0, comision_monto: 0, neto_vendedor: 0,
        canje_detalle: normalizarCanjeDetalle(data.canje_detalle),
      };
    } else if (data.metodo_pago !== undefined) {
      // Deja de ser canje (o confirma un método no-canje) → detalle a NULL
      dataFinal = { ...data, canje_detalle: null };
    } else {
      // Sin cambio de método no se toca canje_detalle (solo se guarda con método canje)
      const { canje_detalle: _ignorado, ...resto } = data;
      dataFinal = resto;
    }
    const updated = await this.repo.updateById(id, empresaId, dataFinal);
    if (!updated) throw Object.assign(new Error('Venta no encontrada'), { statusCode: 404 });
    return updated;
  }
}
