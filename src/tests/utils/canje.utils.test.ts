/**
 * Tests de normalizarCanjeDetalle: trim, vacío → null, truncado a 500.
 */

import { normalizarCanjeDetalle, CANJE_DETALLE_MAX_LENGTH } from '../../shared/utils/canje.utils';

describe('normalizarCanjeDetalle', () => {

  it('hace trim del texto', () => {
    expect(normalizarCanjeDetalle('  corte a cambio de publicidad  ')).toBe('corte a cambio de publicidad');
  });

  it('texto vacío o solo espacios → null', () => {
    expect(normalizarCanjeDetalle('')).toBeNull();
    expect(normalizarCanjeDetalle('   ')).toBeNull();
  });

  it('ausente / null / no-string → null', () => {
    expect(normalizarCanjeDetalle(undefined)).toBeNull();
    expect(normalizarCanjeDetalle(null)).toBeNull();
    expect(normalizarCanjeDetalle(123)).toBeNull();
    expect(normalizarCanjeDetalle({ texto: 'x' })).toBeNull();
  });

  it('trunca a 500 caracteres (no rechaza)', () => {
    const largo = 'a'.repeat(600);
    const resultado = normalizarCanjeDetalle(largo);
    expect(resultado).toHaveLength(CANJE_DETALLE_MAX_LENGTH);
    expect(resultado).toBe('a'.repeat(500));
  });

  it('texto de exactamente 500 caracteres pasa intacto', () => {
    const exacto = 'b'.repeat(500);
    expect(normalizarCanjeDetalle(exacto)).toBe(exacto);
  });
});
