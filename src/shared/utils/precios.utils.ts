import { Producto } from '../../domain/entities/Producto';
import { ConfiguracionProductos } from '../../domain/entities/ConfiguracionProductos';

export const derivarPrecio = (costo: number, pct: number): number =>
  Math.round(costo * (1 + pct / 100) * 100) / 100;

/**
 * Completa los precios NULL de un producto derivándolos de costo × (1 + pct/100).
 * Un precio cargado en DB es un override manual y se respeta tal cual.
 * Los flags *_manual indican al frontend qué precios son override y cuáles derivados.
 */
export const aplicarPreciosDerivados = (producto: Producto, config: ConfiguracionProductos): Producto => {
  const costo = producto.costo != null ? Number(producto.costo) : null;
  const manualEfectivo = producto.precio_efectivo != null;
  const manualTransferencia = producto.precio_transferencia != null;
  const manualTarjeta = producto.precio_tarjeta != null;

  return {
    ...producto,
    precio_efectivo: manualEfectivo
      ? Number(producto.precio_efectivo)
      : (costo != null ? derivarPrecio(costo, config.pct_efectivo) : null),
    precio_transferencia: manualTransferencia
      ? Number(producto.precio_transferencia)
      : (costo != null ? derivarPrecio(costo, config.pct_transferencia) : null),
    precio_tarjeta: manualTarjeta
      ? Number(producto.precio_tarjeta)
      : (costo != null ? derivarPrecio(costo, config.pct_tarjeta) : null),
    precio_efectivo_manual: manualEfectivo,
    precio_transferencia_manual: manualTransferencia,
    precio_tarjeta_manual: manualTarjeta,
  };
};
