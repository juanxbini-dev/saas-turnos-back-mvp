// Utilidades para el método de pago 'canje' (entrega gratis con detalle informativo).

export const CANJE_DETALLE_MAX_LENGTH = 500;

/**
 * Normaliza el detalle de un canje recibido en un request.
 * - trim de espacios
 * - vacío / ausente / no-string → null (el frontend lo valida como requerido;
 *   el backend lo trata como opcional y guarda NULL)
 * - más de 500 caracteres → se TRUNCA (criterio: no rechazar con 400 porque es
 *   un campo informativo; truncar preserva la operación de cobro completa)
 */
export function normalizarCanjeDetalle(detalle: unknown): string | null {
  if (typeof detalle !== 'string') return null;
  const limpio = detalle.trim();
  if (!limpio) return null;
  return limpio.slice(0, CANJE_DETALLE_MAX_LENGTH);
}
