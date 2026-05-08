/**
 * Tests unitarios de GetResumenVentasUseCase.
 *
 * Verifica:
 *   - Validación de fechas obligatorias (statusCode 400)
 *   - Retorno de estructura { totales, por_profesional }
 *   - Correcta propagación de empresaId, fechaDesde y fechaHasta al repo
 *
 * La lógica de cálculo vive en el SQL del repo (getResumen). Este use case
 * solo valida y delega — los tests verifican exactamente eso.
 */

import { GetResumenVentasUseCase } from '../../../application/use-cases/ventas/GetResumenVentasUseCase';
import { IVentaProductoRepository, ResumenTotalesVentas, ResumenProfesional } from '../../../domain/repositories/IVentaProductoRepository';

// ── Factories ─────────────────────────────────────────────────────────────────

function buildResumenTotales(overrides: Partial<ResumenTotalesVentas> = {}): ResumenTotalesVentas {
  return {
    total_ventas:          5000,
    costo_total:           1500,
    ganancia_bruta:        3500,
    ganancia_profesionales: 2000,
    ganancia_empresa:      1500,
    ...overrides,
  };
}

function buildResumenProfesional(overrides: Partial<ResumenProfesional> = {}): ResumenProfesional {
  return {
    vendedor_id:         'vendedor-001',
    nombre:              'Laura Perez',
    comision_producto:   20,
    total_ventas:        2000,
    costo_total:         600,
    ganancia_bruta:      1400,
    ganancia_profesional: 400,
    ganancia_empresa:    1000,
    ...overrides,
  };
}

function buildResumenCompleto(): { totales: ResumenTotalesVentas; por_profesional: ResumenProfesional[] } {
  return {
    totales: buildResumenTotales(),
    por_profesional: [
      buildResumenProfesional({ vendedor_id: 'vendedor-001', nombre: 'Laura Perez' }),
      buildResumenProfesional({ vendedor_id: 'vendedor-002', nombre: 'Carlos Gomez', total_ventas: 3000 }),
    ],
  };
}

// ── Factory de mocks ──────────────────────────────────────────────────────────

function makeMocks() {
  const ventaProductoRepo: jest.Mocked<IVentaProductoRepository> = {
    create:           jest.fn(),
    findByTurno:      jest.fn(),
    deleteByTurno:    jest.fn(),
    findByVendedor:   jest.fn(),
    findAllPaginated: jest.fn(),
    updateById:       jest.fn(),
    deleteById:       jest.fn(),
    getResumen:       jest.fn(),
  };

  return { ventaProductoRepo };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GetResumenVentasUseCase', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── CASOS DE ERROR ────────────────────────────────────────────────────────

  describe('casos de error', () => {

    it('lanza 400 si fechaDesde está vacía', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetResumenVentasUseCase(ventaProductoRepo);

      await expect(useCase.execute('empresa-001', '', '2026-04-30'))
        .rejects.toMatchObject({ statusCode: 400 });

      expect(ventaProductoRepo.getResumen).not.toHaveBeenCalled();
    });

    it('lanza 400 si fechaHasta está vacía', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetResumenVentasUseCase(ventaProductoRepo);

      await expect(useCase.execute('empresa-001', '2026-04-01', ''))
        .rejects.toMatchObject({ statusCode: 400 });

      expect(ventaProductoRepo.getResumen).not.toHaveBeenCalled();
    });

    it('lanza 400 si fechaDesde es undefined', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetResumenVentasUseCase(ventaProductoRepo);

      await expect(useCase.execute('empresa-001', undefined as any, '2026-04-30'))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza 400 si fechaHasta es undefined', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetResumenVentasUseCase(ventaProductoRepo);

      await expect(useCase.execute('empresa-001', '2026-04-01', undefined as any))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('mensaje de error describe ambos campos requeridos', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetResumenVentasUseCase(ventaProductoRepo);

      await expect(useCase.execute('empresa-001', '', ''))
        .rejects.toMatchObject({
          statusCode: 400,
          message: 'fechaDesde y fechaHasta son requeridos',
        });
    });

  });

  // ── ESTRUCTURA DE RETORNO ─────────────────────────────────────────────────

  describe('estructura de retorno', () => {

    it('retorna exactamente { totales, por_profesional }', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetResumenVentasUseCase(ventaProductoRepo);
      const resumen = buildResumenCompleto();
      ventaProductoRepo.getResumen.mockResolvedValue(resumen);

      const resultado = await useCase.execute('empresa-001', '2026-04-01', '2026-04-30');

      expect(resultado).toHaveProperty('totales');
      expect(resultado).toHaveProperty('por_profesional');
    });

    it('totales contiene todos los campos del resumen financiero', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetResumenVentasUseCase(ventaProductoRepo);
      ventaProductoRepo.getResumen.mockResolvedValue(buildResumenCompleto());

      const resultado = await useCase.execute('empresa-001', '2026-04-01', '2026-04-30');

      expect(resultado.totales).toMatchObject({
        total_ventas:          expect.any(Number),
        costo_total:           expect.any(Number),
        ganancia_bruta:        expect.any(Number),
        ganancia_profesionales: expect.any(Number),
        ganancia_empresa:      expect.any(Number),
      });
    });

    it('por_profesional es un array con datos de cada vendedor', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetResumenVentasUseCase(ventaProductoRepo);
      ventaProductoRepo.getResumen.mockResolvedValue(buildResumenCompleto());

      const resultado = await useCase.execute('empresa-001', '2026-04-01', '2026-04-30');

      expect(Array.isArray(resultado.por_profesional)).toBe(true);
      expect(resultado.por_profesional).toHaveLength(2);
      expect(resultado.por_profesional[0]).toMatchObject({
        vendedor_id:          expect.any(String),
        nombre:               expect.any(String),
        comision_producto:    expect.any(Number),
        total_ventas:         expect.any(Number),
        ganancia_profesional: expect.any(Number),
        ganancia_empresa:     expect.any(Number),
      });
    });

    it('retorna el objeto exacto del repo sin modificarlo', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetResumenVentasUseCase(ventaProductoRepo);
      const resumen = buildResumenCompleto();
      ventaProductoRepo.getResumen.mockResolvedValue(resumen);

      const resultado = await useCase.execute('empresa-001', '2026-04-01', '2026-04-30');

      expect(resultado).toBe(resumen);
    });

    it('por_profesional puede ser array vacío si no hay ventas en el período', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetResumenVentasUseCase(ventaProductoRepo);
      ventaProductoRepo.getResumen.mockResolvedValue({
        totales: buildResumenTotales({
          total_ventas: 0,
          costo_total: 0,
          ganancia_bruta: 0,
          ganancia_profesionales: 0,
          ganancia_empresa: 0,
        }),
        por_profesional: [],
      });

      const resultado = await useCase.execute('empresa-001', '2026-04-01', '2026-04-30');

      expect(resultado.por_profesional).toHaveLength(0);
      expect(resultado.totales.total_ventas).toBe(0);
    });

  });

  // ── PROPAGACIÓN DE PARÁMETROS ─────────────────────────────────────────────

  describe('propagación de parámetros al repo', () => {

    it('pasa empresaId, fechaDesde y fechaHasta exactamente al repo', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetResumenVentasUseCase(ventaProductoRepo);
      ventaProductoRepo.getResumen.mockResolvedValue(buildResumenCompleto());

      await useCase.execute('empresa-XYZ', '2026-01-01', '2026-12-31');

      expect(ventaProductoRepo.getResumen).toHaveBeenCalledWith(
        'empresa-XYZ',
        '2026-01-01',
        '2026-12-31'
      );
    });

    it('llama getResumen exactamente una vez', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetResumenVentasUseCase(ventaProductoRepo);
      ventaProductoRepo.getResumen.mockResolvedValue(buildResumenCompleto());

      await useCase.execute('empresa-001', '2026-04-01', '2026-04-30');

      expect(ventaProductoRepo.getResumen).toHaveBeenCalledTimes(1);
    });

    it('no llama ningún otro método del repo', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetResumenVentasUseCase(ventaProductoRepo);
      ventaProductoRepo.getResumen.mockResolvedValue(buildResumenCompleto());

      await useCase.execute('empresa-001', '2026-04-01', '2026-04-30');

      expect(ventaProductoRepo.findAllPaginated).not.toHaveBeenCalled();
      expect(ventaProductoRepo.findByVendedor).not.toHaveBeenCalled();
      expect(ventaProductoRepo.create).not.toHaveBeenCalled();
    });

    it('respeta rangos de fecha amplios correctamente', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetResumenVentasUseCase(ventaProductoRepo);
      ventaProductoRepo.getResumen.mockResolvedValue(buildResumenCompleto());

      await useCase.execute('empresa-001', '2020-01-01', '2026-12-31');

      expect(ventaProductoRepo.getResumen).toHaveBeenCalledWith(
        'empresa-001',
        '2020-01-01',
        '2026-12-31'
      );
    });

  });

});
