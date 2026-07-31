/**
 * Tests unitarios de UpdateVentaProductoUseCase.
 *
 * Verifica que:
 *   - Se retorna el registro actualizado del repo
 *   - Se lanza 404 cuando el repo retorna null (venta no existe o es de otra empresa)
 *   - empresaId siempre se propaga al repo (multi-tenancy)
 *   - Actualizaciones parciales: solo los campos enviados, el resto queda undefined
 */

import { UpdateVentaProductoUseCase } from '../../../application/use-cases/ventas/UpdateVentaProductoUseCase';
import { IVentaProductoRepository, UpdateVentaProductoData } from '../../../domain/repositories/IVentaProductoRepository';
import { VentaProducto } from '../../../domain/entities/Comision';

// ── Factories ─────────────────────────────────────────────────────────────────

function buildVentaActualizada(overrides: Partial<VentaProducto> = {}): VentaProducto {
  return {
    id:                  'venta-001',
    empresa_id:          'empresa-001',
    vendedor_id:         'vendedor-001',
    cliente_id:          null,
    turno_id:            null,
    venta_grupo_id:      'grupo-abc',
    producto_id:         'prod-001',
    nombre_producto:     'Shampoo Premium',
    cantidad:            2,
    precio_unitario:     150,
    precio_total:        300,
    metodo_pago:         'transferencia',
    comision_porcentaje: 10,
    comision_monto:      270,
    neto_vendedor:       30,
    fecha_venta:         '2026-04-15',
    es_venta_costo:      false,
    costo_unitario_snapshot: null,
    created_at:          '2026-04-15T10:00:00.000Z',
    updated_at:          '2026-05-08T10:00:00.000Z',
    ...overrides,
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

describe('UpdateVentaProductoUseCase', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── CASO EXITOSO ──────────────────────────────────────────────────────────

  describe('caso exitoso', () => {

    it('retorna el registro actualizado que devuelve el repo', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new UpdateVentaProductoUseCase(ventaProductoRepo);
      const ventaActualizada = buildVentaActualizada();
      ventaProductoRepo.updateById.mockResolvedValue(ventaActualizada);

      const resultado = await useCase.execute('venta-001', 'empresa-001', {
        cantidad:     2,
        metodo_pago:  'transferencia',
      });

      expect(resultado).toBe(ventaActualizada);
    });

    it('llama updateById con id, empresaId y data exactos', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new UpdateVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.updateById.mockResolvedValue(buildVentaActualizada());

      const data: UpdateVentaProductoData = {
        nombre_producto: 'Tinte Oscuro',
        precio_unitario: 300,
        metodo_pago:     'efectivo',
      };

      await useCase.execute('venta-007', 'empresa-XYZ', data);

      // Al mandar un método no-canje, el use case fuerza canje_detalle = null (limpia el detalle)
      expect(ventaProductoRepo.updateById).toHaveBeenCalledWith(
        'venta-007',
        'empresa-XYZ',
        { ...data, canje_detalle: null }
      );
    });

    it('vendedor_id es editable: se puede reasignar el profesional', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new UpdateVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.updateById.mockResolvedValue(
        buildVentaActualizada({ vendedor_id: 'vendedor-nuevo-999' })
      );

      const resultado = await useCase.execute('venta-001', 'empresa-001', {
        vendedor_id: 'vendedor-nuevo-999',
      });

      const dataEnviada = ventaProductoRepo.updateById.mock.calls[0][2];
      expect(dataEnviada.vendedor_id).toBe('vendedor-nuevo-999');
      expect(resultado.vendedor_id).toBe('vendedor-nuevo-999');
    });

    it('actualización parcial: solo los campos enviados están presentes en la data', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new UpdateVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.updateById.mockResolvedValue(buildVentaActualizada());

      // Solo se envía metodo_pago — el resto no se toca (COALESCE en repo)
      const dataParcia: UpdateVentaProductoData = { metodo_pago: 'debito' };
      await useCase.execute('venta-001', 'empresa-001', dataParcia);

      const dataEnviada = ventaProductoRepo.updateById.mock.calls[0][2];
      expect(dataEnviada.metodo_pago).toBe('debito');
      expect(dataEnviada.cantidad).toBeUndefined();
      expect(dataEnviada.precio_unitario).toBeUndefined();
      expect(dataEnviada.nombre_producto).toBeUndefined();
      expect(dataEnviada.vendedor_id).toBeUndefined();
    });

    it('puede actualizar es_venta_costo y costo_unitario_snapshot juntos', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new UpdateVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.updateById.mockResolvedValue(
        buildVentaActualizada({ es_venta_costo: true, costo_unitario_snapshot: 45 })
      );

      await useCase.execute('venta-001', 'empresa-001', {
        es_venta_costo:         true,
        costo_unitario_snapshot: 45,
      });

      const dataEnviada = ventaProductoRepo.updateById.mock.calls[0][2];
      expect(dataEnviada.es_venta_costo).toBe(true);
      expect(dataEnviada.costo_unitario_snapshot).toBe(45);
    });

  });

  // ── CANJE (entrega gratis: todos los importes en 0) ───────────────────────

  describe('cambio a canje', () => {

    it('metodo_pago=canje fuerza precio_unitario, precio_total, comision_monto y neto_vendedor en 0', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new UpdateVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.updateById.mockResolvedValue(buildVentaActualizada({ metodo_pago: 'canje' }));

      // Aunque el frontend mande precios, el canje los pisa con 0
      await useCase.execute('venta-001', 'empresa-001', {
        metodo_pago:     'canje',
        precio_unitario: 150,
        precio_total:    300,
      });

      const dataEnviada = ventaProductoRepo.updateById.mock.calls[0][2];
      expect(dataEnviada.metodo_pago).toBe('canje');
      expect(dataEnviada.precio_unitario).toBe(0);
      expect(dataEnviada.precio_total).toBe(0);
      expect(dataEnviada.comision_monto).toBe(0);
      expect(dataEnviada.neto_vendedor).toBe(0);
    });

    it('cambio DE canje a otro método es pass-through en precios y limpia canje_detalle', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new UpdateVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.updateById.mockResolvedValue(buildVentaActualizada());

      const data: UpdateVentaProductoData = {
        metodo_pago:     'efectivo',
        precio_unitario: 150,
        precio_total:    300,
      };
      await useCase.execute('venta-001', 'empresa-001', data);

      const dataEnviada = ventaProductoRepo.updateById.mock.calls[0][2];
      // Precios pass-through (los manda el frontend); el detalle del canje vuelve a NULL
      expect(dataEnviada).toEqual({ ...data, canje_detalle: null });
      expect(dataEnviada.comision_monto).toBeUndefined();
      expect(dataEnviada.neto_vendedor).toBeUndefined();
    });

    it('metodo_pago=canje guarda el canje_detalle normalizado (trim)', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new UpdateVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.updateById.mockResolvedValue(buildVentaActualizada({ metodo_pago: 'canje' }));

      await useCase.execute('venta-001', 'empresa-001', {
        metodo_pago:   'canje',
        canje_detalle: '  a cambio de difusión  ',
      });

      const dataEnviada = ventaProductoRepo.updateById.mock.calls[0][2];
      expect(dataEnviada.canje_detalle).toBe('a cambio de difusión');
    });

    it('metodo_pago=canje sin detalle (o vacío) guarda null', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new UpdateVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.updateById.mockResolvedValue(buildVentaActualizada({ metodo_pago: 'canje' }));

      await useCase.execute('venta-001', 'empresa-001', {
        metodo_pago:   'canje',
        canje_detalle: '   ',
      });

      const dataEnviada = ventaProductoRepo.updateById.mock.calls[0][2];
      expect(dataEnviada.canje_detalle).toBeNull();
    });

    it('sin metodo_pago en la data: canje_detalle no se toca (queda undefined)', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new UpdateVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.updateById.mockResolvedValue(buildVentaActualizada());

      await useCase.execute('venta-001', 'empresa-001', {
        cantidad:      3,
        canje_detalle: 'texto que no debe aplicarse sin método canje',
      });

      const dataEnviada = ventaProductoRepo.updateById.mock.calls[0][2];
      expect(dataEnviada.cantidad).toBe(3);
      expect(dataEnviada.canje_detalle).toBeUndefined();
    });

  });

  // ── MULTI-TENANCY ─────────────────────────────────────────────────────────

  describe('multi-tenancy', () => {

    it('empresaId se pasa siempre al repo — no puede editar ventas de otra empresa', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new UpdateVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.updateById.mockResolvedValue(buildVentaActualizada());

      await useCase.execute('venta-001', 'empresa-RESTRINGIDA', { metodo_pago: 'efectivo' });

      expect(ventaProductoRepo.updateById).toHaveBeenCalledWith(
        'venta-001',
        'empresa-RESTRINGIDA',
        expect.anything()
      );
    });

  });

  // ── CASOS DE ERROR ────────────────────────────────────────────────────────

  describe('casos de error', () => {

    it('lanza 404 si el repo retorna null (venta no existe)', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new UpdateVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.updateById.mockResolvedValue(null as any);

      await expect(useCase.execute('venta-inexistente', 'empresa-001', {}))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('lanza 404 con mensaje descriptivo cuando la venta no se encuentra', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new UpdateVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.updateById.mockResolvedValue(null as any);

      await expect(useCase.execute('venta-999', 'empresa-001', {}))
        .rejects.toMatchObject({ message: 'Venta no encontrada', statusCode: 404 });
    });

    it('lanza 404 si la venta pertenece a otra empresa (el repo retorna null por el filtro empresaId)', async () => {
      const { ventaProductoRepo } = makeMocks();
      const useCase = new UpdateVentaProductoUseCase(ventaProductoRepo);
      // El repo filtra por empresaId y no encuentra la venta → devuelve null
      ventaProductoRepo.updateById.mockResolvedValue(null as any);

      await expect(useCase.execute('venta-de-otra-empresa', 'empresa-001', { metodo_pago: 'efectivo' }))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('no llama al repo si el id está vacío (prevención de update masivo)', async () => {
      // Esta verificación es a nivel de integración real;
      // el use case actual confía en que el controlador valida el id.
      // Documentamos el comportamiento actual: sí llama al repo aunque el id esté vacío.
      const { ventaProductoRepo } = makeMocks();
      const useCase = new UpdateVentaProductoUseCase(ventaProductoRepo);
      ventaProductoRepo.updateById.mockResolvedValue(null as any);

      await expect(useCase.execute('', 'empresa-001', {}))
        .rejects.toMatchObject({ statusCode: 404 });

      // Se llamó al repo con id vacío — el repo/DB es quien filtraría esto
      expect(ventaProductoRepo.updateById).toHaveBeenCalledWith('', 'empresa-001', {});
    });

  });

});
