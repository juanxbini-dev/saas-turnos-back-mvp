/**
 * Tests unitarios de calcularComisiones.
 *
 * Nomenclatura de comisión:
 *   comision_turno  = % que recibe el PROFESIONAL del servicio
 *   comision_producto = % que recibe el PROFESIONAL del producto
 *
 * La empresa recibe el remanente (100% - porcentaje profesional).
 */

import { calcularComisiones } from '../../shared/utils/calculos.utils';

// ── Helpers ──────────────────────────────────────────────────────────────────

function configComision(turno: number, producto = 0) {
  return { comision_turno: turno, comision_producto: producto };
}

const APLICAR_A_AMBOS = { servicio: true, productos: true };
const SOLO_SERVICIO   = { servicio: true, productos: false };
const SOLO_PRODUCTOS  = { servicio: false, productos: true };
const NINGUNO         = { servicio: false, productos: false };

// ── Suite principal ───────────────────────────────────────────────────────────

describe('calcularComisiones', () => {

  // ── 1. Caso base: solo servicio, sin descuento, comisión 70% ─────────────

  describe('servicio solo, sin descuento', () => {
    it('comisión 70%: profesional recibe 70, empresa 30', () => {
      const r = calcularComisiones(100, 0, 0, configComision(70));

      expect(r.comisionServicio.base).toBe(100);
      expect(r.comisionServicio.netoProfesional).toBeCloseTo(70);
      expect(r.comisionServicio.montoEmpresa).toBeCloseTo(30);
      expect(r.comisionServicio.porcentajeEmpresa).toBe(70);
      expect(r.totales.totalRecaudado).toBe(100);
      expect(r.totales.totalProfesional).toBeCloseTo(70);
      expect(r.totales.totalEmpresa).toBeCloseTo(30);
    });

    it('descuentoMonto es 0 cuando descuentoPorcentaje es 0', () => {
      const r = calcularComisiones(500, 0, 0, configComision(70));
      expect(r.descuentoMonto).toBe(0);
      expect(r.totalConDescuento).toBe(500);
    });
  });

  // ── 2. Servicio + productos, sin descuento ────────────────────────────────

  describe('servicio + productos, sin descuento', () => {
    it('calcula totales correctamente para ambos ítems', () => {
      // Profesional: 70% servicio, 50% producto
      const r = calcularComisiones(200, 100, 0, configComision(70, 50));

      expect(r.subtotalOriginal).toBe(300);
      expect(r.descuentoMonto).toBe(0);
      expect(r.totalConDescuento).toBe(300);

      // Servicio: profesional 70 = 140, empresa 30 = 60
      expect(r.comisionServicio.base).toBe(200);
      expect(r.comisionServicio.netoProfesional).toBeCloseTo(140);
      expect(r.comisionServicio.montoEmpresa).toBeCloseTo(60);

      // Producto: profesional 50 = 50, empresa 50 = 50
      expect(r.comisionProductos.base).toBe(100);
      expect(r.comisionProductos.netoProfesional).toBeCloseTo(50);
      expect(r.comisionProductos.montoEmpresa).toBeCloseTo(50);

      expect(r.totales.totalProfesional).toBeCloseTo(190);
      expect(r.totales.totalEmpresa).toBeCloseTo(110);
    });
  });

  // ── 3. Descuento aplicado solo al servicio ────────────────────────────────

  describe('descuento aplicado solo al servicio', () => {
    it('10% de descuento sobre 200 de servicio = 20 de descuento, productos sin tocar', () => {
      const r = calcularComisiones(200, 100, 10, configComision(70, 50), SOLO_SERVICIO);

      expect(r.descuentoMonto).toBeCloseTo(20);          // 10% de 200
      expect(r.totalConDescuento).toBeCloseTo(280);      // 300 - 20
      expect(r.comisionServicio.base).toBeCloseTo(180);  // servicio con descuento
      expect(r.comisionProductos.base).toBe(100);        // productos sin tocar
    });
  });

  // ── 4. Descuento aplicado solo a productos ────────────────────────────────

  describe('descuento aplicado solo a productos', () => {
    it('10% de descuento sobre 100 de productos = 10 de descuento, servicio sin tocar', () => {
      const r = calcularComisiones(200, 100, 10, configComision(70, 50), SOLO_PRODUCTOS);

      expect(r.descuentoMonto).toBeCloseTo(10);          // 10% de 100
      expect(r.totalConDescuento).toBeCloseTo(290);      // 300 - 10
      expect(r.comisionServicio.base).toBe(200);         // servicio sin tocar
      expect(r.comisionProductos.base).toBeCloseTo(90);  // productos con descuento
    });
  });

  // ── 5. Descuento aplicado a ambos (default) ───────────────────────────────

  describe('descuento aplicado a ambos (default)', () => {
    it('10% de descuento sobre 300 total = 30 de descuento distribuido proporcionalmente', () => {
      const r = calcularComisiones(200, 100, 10, configComision(70, 50), APLICAR_A_AMBOS);

      expect(r.descuentoMonto).toBeCloseTo(30);           // 10% de 300
      expect(r.totalConDescuento).toBeCloseTo(270);       // 300 - 30
      // Servicio: 200/300 * 30 = 20 de descuento → 180
      expect(r.comisionServicio.base).toBeCloseTo(180);
      // Productos: 100/300 * 30 = 10 de descuento → 90
      expect(r.comisionProductos.base).toBeCloseTo(90);
    });

    it('los totales cuadran: totalProfesional + totalEmpresa === totalRecaudado', () => {
      const r = calcularComisiones(200, 100, 10, configComision(70, 50), APLICAR_A_AMBOS);
      const suma = r.totales.totalProfesional + r.totales.totalEmpresa;
      expect(suma).toBeCloseTo(r.totales.totalRecaudado);
    });
  });

  // ── 6. descuentoAplicarA = ninguno, con descuentoPorcentaje > 0 ───────────

  describe('descuentoAplicarA ambos false → descuento efectivo cero', () => {
    it('aunque descuentoPorcentaje=10, si ambos flags son false el descuento es 0', () => {
      const r = calcularComisiones(200, 100, 10, configComision(70, 50), NINGUNO);

      // baseDescuento = 0 → descuentoMonto = 0
      expect(r.descuentoMonto).toBe(0);
      expect(r.totalConDescuento).toBe(300);
      // Las bases de comisión no se modifican
      expect(r.comisionServicio.base).toBe(200);
      expect(r.comisionProductos.base).toBe(100);
    });
  });

  // ── 7. BUG DOCUMENTADO: precioServicio=0 con montoProductos > 0 ──────────
  //
  // Este caso expone el bug en FinalizarTurnoUseCase y EditarPagoTurnoUseCase:
  //   const precioServicio = Number(data.precioModificado || turno.precio);
  // Cuando precioModificado = 0, la expresión `0 || turno.precio` evalúa
  // turno.precio en lugar de 0. calcularComisiones en sí acepta 0 sin problema;
  // el bug está un nivel más arriba, en el use case.
  //
  // Aquí verificamos que calcularComisiones NO produce NaN con servicio=0.

  describe('BUG: precioServicio=0 (servicio gratis)', () => {
    it('no retorna NaN cuando precioServicio=0 y hay productos', () => {
      const r = calcularComisiones(0, 100, 0, configComision(70, 50));

      // Ningún campo debe ser NaN
      expect(isNaN(r.comisionServicio.base)).toBe(false);
      expect(isNaN(r.comisionServicio.netoProfesional)).toBe(false);
      expect(isNaN(r.comisionServicio.montoEmpresa)).toBe(false);
      expect(isNaN(r.totales.totalRecaudado)).toBe(false);
      expect(isNaN(r.totales.totalProfesional)).toBe(false);
      expect(isNaN(r.totales.totalEmpresa)).toBe(false);

      // Valores esperados para servicio en 0
      expect(r.comisionServicio.base).toBe(0);
      expect(r.comisionServicio.netoProfesional).toBe(0);
      expect(r.comisionServicio.montoEmpresa).toBe(0);
      expect(r.totales.totalRecaudado).toBe(100);
    });

    it('no retorna NaN cuando AMBOS son 0 (turno gratuito sin productos)', () => {
      const r = calcularComisiones(0, 0, 0, configComision(70, 50));
      expect(isNaN(r.totales.totalRecaudado)).toBe(false);
      expect(r.totales.totalRecaudado).toBe(0);
      expect(r.totales.totalProfesional).toBe(0);
      expect(r.totales.totalEmpresa).toBe(0);
    });

    // BUG DOCUMENTADO (nivel use case): precioModificado=0 usa turno.precio
    // Este test documenta el comportamiento ACTUAL (defectuoso) a nivel de
    // la expresión `Number(data.precioModificado || turno.precio)`.
    it('DOCUMENTA BUG: 0 || fallback retorna fallback (comportamiento defectuoso del use case)', () => {
      const precioModificado = 0;
      const precioDeTurno    = 500;
      // Así lo evalúa el use case actualmente:
      const precioServicioActual = Number(precioModificado || precioDeTurno);
      // Debería ser 0, pero es 500
      expect(precioServicioActual).toBe(500); // comportamiento ACTUAL (bug)
      // El valor correcto sería:
      const precioServicioCorrecto = precioModificado !== undefined ? precioModificado : precioDeTurno;
      expect(precioServicioCorrecto).toBe(0); // comportamiento ESPERADO
    });
  });

  // ── 8. Comisión 0% (empresa se queda con todo) ────────────────────────────

  describe('comisión 0% para el profesional', () => {
    it('el profesional recibe 0 y la empresa recibe el total', () => {
      const r = calcularComisiones(100, 0, 0, configComision(0));

      expect(r.comisionServicio.netoProfesional).toBe(0);
      expect(r.comisionServicio.montoEmpresa).toBe(100);
      expect(r.totales.totalProfesional).toBe(0);
      expect(r.totales.totalEmpresa).toBe(100);
    });
  });

  // ── 9. Comisión 100% (profesional se queda con todo) ─────────────────────

  describe('comisión 100% para el profesional', () => {
    it('el profesional recibe el total y la empresa recibe 0', () => {
      const r = calcularComisiones(100, 0, 0, configComision(100));

      expect(r.comisionServicio.netoProfesional).toBe(100);
      expect(r.comisionServicio.montoEmpresa).toBe(0);
      expect(r.totales.totalProfesional).toBe(100);
      expect(r.totales.totalEmpresa).toBe(0);
    });
  });

  // ── 10. Números grandes ───────────────────────────────────────────────────

  describe('números grandes', () => {
    it('maneja montos de 6 cifras sin pérdida de precisión significativa', () => {
      const r = calcularComisiones(100000, 50000, 15, configComision(70, 50), APLICAR_A_AMBOS);

      expect(r.subtotalOriginal).toBe(150000);
      expect(r.descuentoMonto).toBeCloseTo(22500); // 15% de 150000
      expect(r.totalConDescuento).toBeCloseTo(127500);
      const suma = r.totales.totalProfesional + r.totales.totalEmpresa;
      expect(suma).toBeCloseTo(r.totales.totalRecaudado, 5);
    });
  });

  // ── 11. Verificaciones de estructura de retorno ───────────────────────────

  describe('estructura del objeto retornado', () => {
    it('incluye todos los campos del tipo CalculoCompletoTurno', () => {
      const r = calcularComisiones(100, 0, 0, configComision(70));

      expect(r).toHaveProperty('precioOriginalServicio');
      expect(r).toHaveProperty('precioOriginalProductos');
      expect(r).toHaveProperty('subtotalOriginal');
      expect(r).toHaveProperty('descuentoPorcentaje');
      expect(r).toHaveProperty('descuentoMonto');
      expect(r).toHaveProperty('totalConDescuento');
      expect(r).toHaveProperty('comisionServicio');
      expect(r).toHaveProperty('comisionProductos');
      expect(r).toHaveProperty('totales');
      expect(r.comisionServicio).toHaveProperty('base');
      expect(r.comisionServicio).toHaveProperty('porcentajeEmpresa');
      expect(r.comisionServicio).toHaveProperty('montoEmpresa');
      expect(r.comisionServicio).toHaveProperty('netoProfesional');
    });

    it('precioOriginalServicio y precioOriginalProductos reflejan los valores de entrada', () => {
      const r = calcularComisiones(300, 150, 0, configComision(70, 50));
      expect(r.precioOriginalServicio).toBe(300);
      expect(r.precioOriginalProductos).toBe(150);
    });
  });
});
