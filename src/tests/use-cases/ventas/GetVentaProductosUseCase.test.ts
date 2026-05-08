/**
 * Tests unitarios de GetVentaProductosUseCase.
 *
 * Verifica paginación, validación de fechas obligatorias y correcta
 * propagación de filtros opcionales (vendedor_id, page, limit).
 */

import { GetVentaProductosUseCase } from '../../../application/use-cases/ventas/GetVentaProductosUseCase';
import { IVentaProductoRepository, VentaProductoFiltros, VentaProductoConVendedor } from '../../../domain/repositories/IVentaProductoRepository';

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

function buildFiltros(overrides: Partial<VentaProductoFiltros> = {}): VentaProductoFiltros {
  return {
    fechaDesde:  '2026-04-01',
    fechaHasta:  '2026-04-30',
    page:        1,
    limit:       20,
    ...overrides,
  };
}

function buildResultadoPaginado(
  rows: Partial<VentaProductoConVendedor>[] = [],
  total = 0
): { rows: VentaProductoConVendedor[]; total: number } {
  return {
    total,
    rows: rows.map(r => ({
      id:                  'venta-001',
      empresa_id:          'empresa-001',
      vendedor_id:         'vendedor-001',
      cliente_id:          null,
      turno_id:            null,
      venta_grupo_id:      'grupo-abc',
      producto_id:         'prod-001',
      nombre_producto:     'Shampoo',
      cantidad:            1,
      precio_unitario:     100,
      precio_total:        100,
      metodo_pago:         'efectivo',
      comision_porcentaje: 10,
      comision_monto:      90,
      neto_vendedor:       10,
      fecha_venta:         null,
      es_venta_costo:      false,
      costo_unitario_snapshot: null,
      created_at:          '2026-04-15T10:00:00.000Z',
      updated_at:          '2026-04-15T10:00:00.000Z',
      vendedor_nombre:     'Laura Perez',
      cliente_nombre:      null,
      ...r,
    })),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GetVentaProductosUseCase', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── CASOS DE ERROR ────────────────────────────────────────────────────────

  describe('casos de error', () => {

    it('lanza 400 si falta fechaDesde', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetVentaProductosUseCase(ventaProductoRepo);

      await expect(
        useCase.execute('empresa-001', buildFiltros({ fechaDesde: '' }))
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(ventaProductoRepo.findAllPaginated).not.toHaveBeenCalled();
    });

    it('lanza 400 si falta fechaHasta', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetVentaProductosUseCase(ventaProductoRepo);

      await expect(
        useCase.execute('empresa-001', buildFiltros({ fechaHasta: '' }))
      ).rejects.toMatchObject({ statusCode: 400 });

      expect(ventaProductoRepo.findAllPaginated).not.toHaveBeenCalled();
    });

    it('lanza 400 si fechaDesde es undefined', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetVentaProductosUseCase(ventaProductoRepo);

      await expect(
        useCase.execute('empresa-001', buildFiltros({ fechaDesde: undefined as any }))
      ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza 400 si fechaHasta es undefined', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetVentaProductosUseCase(ventaProductoRepo);

      await expect(
        useCase.execute('empresa-001', buildFiltros({ fechaHasta: undefined as any }))
      ).rejects.toMatchObject({ statusCode: 400 });
    });

  });

  // ── CASO EXITOSO ──────────────────────────────────────────────────────────

  describe('caso exitoso', () => {

    it('retorna el resultado paginado del repo correctamente', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetVentaProductosUseCase(ventaProductoRepo);
      const respuestaEsperada = buildResultadoPaginado([{}, {}], 2);
      ventaProductoRepo.findAllPaginated.mockResolvedValue(respuestaEsperada);

      const resultado = await useCase.execute('empresa-001', buildFiltros());

      expect(resultado).toBe(respuestaEsperada);
      expect(resultado.rows).toHaveLength(2);
      expect(resultado.total).toBe(2);
    });

    it('pasa empresaId y filtros completos al repo', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetVentaProductosUseCase(ventaProductoRepo);
      ventaProductoRepo.findAllPaginated.mockResolvedValue(buildResultadoPaginado());

      const filtros = buildFiltros({ fechaDesde: '2026-01-01', fechaHasta: '2026-12-31', page: 2, limit: 10 });
      await useCase.execute('empresa-ABC', filtros);

      expect(ventaProductoRepo.findAllPaginated).toHaveBeenCalledWith('empresa-ABC', filtros);
    });

    it('con vendedor_id en filtros: lo pasa al repo', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetVentaProductosUseCase(ventaProductoRepo);
      ventaProductoRepo.findAllPaginated.mockResolvedValue(buildResultadoPaginado());

      const filtros = buildFiltros({ vendedor_id: 'vendedor-007' });
      await useCase.execute('empresa-001', filtros);

      const [, filtrosPasados] = ventaProductoRepo.findAllPaginated.mock.calls[0];
      expect(filtrosPasados.vendedor_id).toBe('vendedor-007');
    });

    it('sin vendedor_id: lo pasa como undefined al repo', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetVentaProductosUseCase(ventaProductoRepo);
      ventaProductoRepo.findAllPaginated.mockResolvedValue(buildResultadoPaginado());

      const filtros = buildFiltros();
      // No se asigna vendedor_id, queda como undefined
      await useCase.execute('empresa-001', filtros);

      const [, filtrosPasados] = ventaProductoRepo.findAllPaginated.mock.calls[0];
      expect(filtrosPasados.vendedor_id).toBeUndefined();
    });

    it('respeta page y limit pasados en los filtros', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetVentaProductosUseCase(ventaProductoRepo);
      ventaProductoRepo.findAllPaginated.mockResolvedValue(buildResultadoPaginado());

      const filtros = buildFiltros({ page: 3, limit: 5 });
      await useCase.execute('empresa-001', filtros);

      const [, filtrosPasados] = ventaProductoRepo.findAllPaginated.mock.calls[0];
      expect(filtrosPasados.page).toBe(3);
      expect(filtrosPasados.limit).toBe(5);
    });

    it('retorna lista vacía cuando no hay ventas en el período', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new GetVentaProductosUseCase(ventaProductoRepo);
      ventaProductoRepo.findAllPaginated.mockResolvedValue({ rows: [], total: 0 });

      const resultado = await useCase.execute('empresa-001', buildFiltros());

      expect(resultado.rows).toHaveLength(0);
      expect(resultado.total).toBe(0);
    });

  });

});
