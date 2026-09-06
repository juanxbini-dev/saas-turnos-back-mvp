/**
 * Tests unitarios de DateUtils — las dos funciones de las que depende
 * el fix de fecha_venta (fix/ventas-fecha-venta):
 *
 *   - nowAR():        "hoy" según el reloj de Argentina (UTC-3). El server corre
 *                     en UTC: después de las 21:00 AR, un new Date() ingenuo ya
 *                     está en el día siguiente. Si esto falla, toda venta cargada
 *                     de noche cae en el día equivocado del tab Ventas.
 *   - normalizeDate(): node-pg devuelve las columnas DATE como objeto Date y el
 *                     resto del sistema maneja strings 'YYYY-MM-DD'. Si esto
 *                     falla, la venta de un turno queda con fecha corrida o rota.
 *
 * Se usa jest.setSystemTime para fijar el instante — sin eso el test dependería
 * de la hora a la que corre la suite y no verificaría el borde de medianoche.
 */

import { DateUtils } from '../../shared/utils/DateUtils';

describe('DateUtils', () => {

  // ── nowAR: "hoy" en hora argentina ──────────────────────────────────────────

  describe('nowAR', () => {

    afterEach(() => {
      jest.useRealTimers();
    });

    it('de noche en Argentina (22:30 AR = 01:30 UTC del día siguiente) la fecha es la del día argentino, no la UTC', () => {
      // Este es EL caso del bug: venta cargada a las 22:30 quedaba fechada mañana.
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-09-06T01:30:00.000Z')); // 2026-09-05 22:30 en AR

      const ahora = DateUtils.nowAR();
      expect(ahora.fecha).toBe('2026-09-05');
      expect(ahora.minutos).toBe(22 * 60 + 30);
    });

    it('a mediodía la fecha coincide en UTC y en Argentina (caso normal del horario del salón)', () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-09-06T15:00:00.000Z')); // 12:00 en AR

      const ahora = DateUtils.nowAR();
      expect(ahora.fecha).toBe('2026-09-06');
      expect(ahora.minutos).toBe(12 * 60);
    });

    it('cambio de año: 1/ene 02:00 UTC todavía es 31/dic en Argentina', () => {
      // Si esto falla, las ventas de la noche de fin de año caen en el año siguiente
      // y los totales de diciembre quedan cortos.
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2027-01-01T02:00:00.000Z')); // 2026-12-31 23:00 en AR

      expect(DateUtils.nowAR().fecha).toBe('2026-12-31');
    });

  });

  // ── normalizeDate: cualquier entrada → 'YYYY-MM-DD' ─────────────────────────

  describe('normalizeDate', () => {

    it('objeto Date (como devuelve node-pg una columna DATE) → string YYYY-MM-DD', () => {
      const fechaTurno = new Date('2026-05-08T00:00:00.000Z');
      expect(DateUtils.normalizeDate(fechaTurno)).toBe('2026-05-08');
    });

    it('Date a última hora del día UTC no se corre de día', () => {
      expect(DateUtils.normalizeDate(new Date('2026-05-08T23:59:59.000Z'))).toBe('2026-05-08');
    });

    it("string 'YYYY-MM-DD' pasa tal cual", () => {
      expect(DateUtils.normalizeDate('2026-05-08')).toBe('2026-05-08');
    });

    it('string ISO con hora → se queda solo con la parte de fecha', () => {
      expect(DateUtils.normalizeDate('2026-05-08T14:30:00.000Z')).toBe('2026-05-08');
    });

  });

});
