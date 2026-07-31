/**
 * Tests unitarios de FinalizarTurnoUseCase.
 *
 * Todos los repositorios son mocks puros (jest.fn()); no se toca la DB.
 *
 * Flujo que cubre este use case:
 *   1. findById(turnoId)         → valida estado 'confirmado'
 *   2. findById(profesionalId)   → obtiene comisiones del profesional
 *   3. calcularComisiones(...)   → cálculo en memoria
 *   4. turnoRepository.finalizar → actualiza turno a 'completado'
 *   5. [opcional] delete + create productos + deductStock
 *   6. comisionRepository.create → registra comisión con estado 'pendiente'
 */

import { FinalizarTurnoUseCase } from '../../application/use-cases/turnos/FinalizarTurnoUseCase';
import { ITurnoRepository }      from '../../domain/repositories/ITurnoRepository';
import { IUsuarioRepository }    from '../../domain/repositories/IUsuarioRepository';
import { IComisionRepository }   from '../../domain/repositories/IComisionRepository';
import { IVentaProductoRepository } from '../../domain/repositories/IVentaProductoRepository';
import { IProductoRepository }   from '../../domain/repositories/IProductoRepository';
import { TurnoConDetalle, FinalizarTurnoData, Turno } from '../../domain/entities/Turno';
import { UsuarioPublico }        from '../../domain/entities/User';
import { ComisionTurno }         from '../../domain/entities/Comision';

// ── Factories de datos de prueba ──────────────────────────────────────────────

function buildTurnoConfirmado(overrides: Partial<TurnoConDetalle> = {}): TurnoConDetalle {
  return {
    id:              'turno-001',
    cliente_id:      'cliente-001',
    usuario_id:      'prof-001',
    servicio_id:     'servicio-001',
    fecha:           '2026-05-08',
    hora:            '10:00',
    estado:          'confirmado',
    notas:           null,
    servicio:        'Corte',
    precio:          1000,
    duracion_minutos: 45,
    empresa_id:      'empresa-001',
    created_at:      '2026-05-08T09:00:00.000Z',
    updated_at:      '2026-05-08T09:00:00.000Z',
    cliente_nombre:  'Ana López',
    cliente_email:   'ana@test.com',
    usuario_nombre:  'Carlos Gómez',
    usuario_username: 'cgomez',
    ...overrides,
  };
}

function buildTurnoFinalizado(base: Partial<Turno> = {}): Turno {
  return {
    id:              'turno-001',
    cliente_id:      'cliente-001',
    usuario_id:      'prof-001',
    servicio_id:     'servicio-001',
    fecha:           '2026-05-08',
    hora:            '10:00',
    estado:          'completado',
    notas:           null,
    servicio:        'Corte',
    precio:          1000,
    duracion_minutos: 45,
    empresa_id:      'empresa-001',
    created_at:      '2026-05-08T09:00:00.000Z',
    updated_at:      '2026-05-08T10:30:00.000Z',
    ...base,
  };
}

function buildProfesional(overrides: Partial<UsuarioPublico> = {}): UsuarioPublico {
  return {
    id:            'prof-001',
    email:         'prof@test.com',
    nombre:        'Carlos Gómez',
    username:      'cgomez',
    empresa_id:    'empresa-001',
    roles:         ['staff'],
    activo:        true,
    last_login:    null,
    created_at:    '2026-01-01T00:00:00.000Z',
    updated_at:    '2026-01-01T00:00:00.000Z',
    comision_turno:   70,
    comision_producto: 50,
    ...overrides,
  };
}

function buildComision(): ComisionTurno {
  return {
    id:                          'comision-001',
    turno_id:                    'turno-001',
    profesional_id:              'prof-001',
    empresa_id:                  'empresa-001',
    servicio_monto:              1000,
    servicio_comision_porcentaje: 70,
    servicio_comision_monto:     300,
    servicio_neto_profesional:   700,
    estado:                      'pendiente',
    created_at:                  '2026-05-08T10:30:00.000Z',
    updated_at:                  '2026-05-08T10:30:00.000Z',
  };
}

function buildInputBase(overrides: Partial<FinalizarTurnoData> = {}): FinalizarTurnoData {
  return {
    turnoId:      'turno-001',
    profesionalId: 'prof-001',
    empresaId:    'empresa-001',
    metodoPago:   'efectivo',
    ...overrides,
  };
}

// ── Factory de mocks de repositorios ─────────────────────────────────────────

function buildMocks() {
  const turnoRepo: jest.Mocked<ITurnoRepository> = {
    findById:                            jest.fn(),
    findByEmpresa:                       jest.fn(),
    findByProfesional:                   jest.fn(),
    findByFechaYProfesional:             jest.fn(),
    findByProfesionalEnRango:            jest.fn(),
    create:                              jest.fn(),
    updateEstado:                        jest.fn(),
    finalizar:                           jest.fn(),
    marcarConfirmacionWhatsappEnviada:   jest.fn(),
    findConfirmadosDelDiaSinRecordatorio: jest.fn(),
    marcarRecordatorioEnviado:           jest.fn(),
    completarVencidos:                   jest.fn(),
    findByClienteAndProfesional:         jest.fn(),
  };

  const usuarioRepo: jest.Mocked<IUsuarioRepository> = {
    findByEmpresa:                jest.fn(),
    findById:                     jest.fn(),
    findByIdWithPassword:         jest.fn(),
    create:                       jest.fn(),
    updateDatos:                  jest.fn(),
    updatePassword:               jest.fn(),
    updateRol:                    jest.fn(),
    delete:                       jest.fn(),
    existeUsername:               jest.fn(),
    existeEmail:                  jest.fn(),
    findProfesionalesByEmpresa:   jest.fn(),
    countProfesionalesByEmpresa:  jest.fn(),
    updateAvatar:                 jest.fn(),
  };

  const comisionRepo: jest.Mocked<IComisionRepository> = {
    create:        jest.fn(),
    findByTurno:   jest.fn(),
    findByProfesional: jest.fn(),
    findByEmpresa: jest.fn(),
    updateEstado:  jest.fn(),
    updateByTurno: jest.fn(),
  };

  const ventaProductoRepo: jest.Mocked<IVentaProductoRepository> = {
    create:             jest.fn(),
    findByTurno:        jest.fn(),
    deleteByTurno:      jest.fn(),
    findByVendedor:     jest.fn(),
    findAllPaginated:   jest.fn(),
    updateById:         jest.fn(),
    deleteById:         jest.fn(),
    getResumen:         jest.fn(),
  };

  const catalogoProductoRepo: jest.Mocked<IProductoRepository> = {
    findAll:           jest.fn(),
    findById:          jest.fn(),
    create:            jest.fn(),
    update:            jest.fn(),
    addStock:          jest.fn(),
    deductStock:       jest.fn(),
    delete:            jest.fn(),
    findByNombre:      jest.fn(),
    findBajoStock:     jest.fn(),
    getTopVendidos:    jest.fn(),
    getTopVendedores:  jest.fn(),
    getVentasFinanzas: jest.fn(),
    resetPreciosManuales: jest.fn(),
    countManualesSinCosto: jest.fn(),
  };

  return { turnoRepo, usuarioRepo, comisionRepo, ventaProductoRepo, catalogoProductoRepo };
}

function buildUseCase(mocks: ReturnType<typeof buildMocks>) {
  return new FinalizarTurnoUseCase(
    mocks.turnoRepo,
    mocks.usuarioRepo,
    mocks.comisionRepo,
    mocks.ventaProductoRepo,
    mocks.catalogoProductoRepo
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FinalizarTurnoUseCase', () => {

  // ── CASOS DE ERROR ────────────────────────────────────────────────────────

  describe('casos de error', () => {
    it('lanza 404 si el turno no existe', async () => {
      const mocks = buildMocks();
      mocks.turnoRepo.findById.mockResolvedValue(null);

      const useCase = buildUseCase(mocks);

      await expect(useCase.execute(buildInputBase()))
        .rejects.toMatchObject({ message: 'Turno no encontrado', statusCode: 404 });
    });

    it('lanza 400 si el turno ya está completado', async () => {
      const mocks = buildMocks();
      mocks.turnoRepo.findById.mockResolvedValue(
        buildTurnoConfirmado({ estado: 'completado' })
      );

      const useCase = buildUseCase(mocks);

      await expect(useCase.execute(buildInputBase()))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza 400 si el turno está cancelado', async () => {
      const mocks = buildMocks();
      mocks.turnoRepo.findById.mockResolvedValue(
        buildTurnoConfirmado({ estado: 'cancelado' })
      );

      const useCase = buildUseCase(mocks);

      await expect(useCase.execute(buildInputBase()))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza 400 si el turno está pendiente', async () => {
      const mocks = buildMocks();
      mocks.turnoRepo.findById.mockResolvedValue(
        buildTurnoConfirmado({ estado: 'pendiente' })
      );

      const useCase = buildUseCase(mocks);

      await expect(useCase.execute(buildInputBase()))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza 404 si el profesional no existe', async () => {
      const mocks = buildMocks();
      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoConfirmado());
      mocks.usuarioRepo.findById.mockResolvedValue(null);

      const useCase = buildUseCase(mocks);

      await expect(useCase.execute(buildInputBase()))
        .rejects.toMatchObject({ message: 'Profesional no encontrado', statusCode: 404 });
    });
  });

  // ── CASO FELIZ: sin productos ─────────────────────────────────────────────

  describe('finalización sin productos', () => {
    it('actualiza el turno a completado y crea la comisión exactamente una vez', async () => {
      const mocks = buildMocks();
      const turnoFinalizado = buildTurnoFinalizado();

      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoConfirmado());
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional());
      mocks.turnoRepo.finalizar.mockResolvedValue(turnoFinalizado);
      mocks.comisionRepo.create.mockResolvedValue(buildComision());

      const useCase = buildUseCase(mocks);
      const resultado = await useCase.execute(buildInputBase());

      expect(resultado.estado).toBe('completado');
      expect(mocks.comisionRepo.create).toHaveBeenCalledTimes(1);
      // No debe tocar venta_productos
      expect(mocks.ventaProductoRepo.deleteByTurno).not.toHaveBeenCalled();
      expect(mocks.ventaProductoRepo.create).not.toHaveBeenCalled();
      expect(mocks.catalogoProductoRepo.deductStock).not.toHaveBeenCalled();
    });

    it('llama turnoRepository.finalizar con estado completado, finalizado_at no null y metodoPago', async () => {
      const mocks = buildMocks();
      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoConfirmado());
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional());
      mocks.turnoRepo.finalizar.mockResolvedValue(buildTurnoFinalizado());
      mocks.comisionRepo.create.mockResolvedValue(buildComision());

      await buildUseCase(mocks).execute(buildInputBase({ metodoPago: 'transferencia' }));

      const [turnoId, finalizarData] = mocks.turnoRepo.finalizar.mock.calls[0];
      expect(turnoId).toBe('turno-001');
      expect(finalizarData.metodoPago).toBe('transferencia');
      expect(finalizarData.finalizado_at).toBeDefined();
      expect(finalizarData.finalizado_at).not.toBeNull();
      expect(finalizarData.finalizado_por_id).toBe('prof-001');
    });

    it('comisionRepository.create recibe los campos calculados correctamente', async () => {
      const mocks = buildMocks();
      // Precio 1000, comisión turno 70% → profesional 700, empresa 300
      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoConfirmado({ precio: 1000 }));
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional({ comision_turno: 70 }));
      mocks.turnoRepo.finalizar.mockResolvedValue(buildTurnoFinalizado());
      mocks.comisionRepo.create.mockResolvedValue(buildComision());

      await buildUseCase(mocks).execute(buildInputBase());

      const comisionArg = mocks.comisionRepo.create.mock.calls[0][0];
      expect(comisionArg.turno_id).toBe('turno-001');
      expect(comisionArg.profesional_id).toBe('prof-001');
      expect(comisionArg.empresa_id).toBe('empresa-001');
      expect(comisionArg.servicio_monto).toBeCloseTo(1000);
      expect(comisionArg.servicio_comision_porcentaje).toBe(70);
      expect(comisionArg.servicio_neto_profesional).toBeCloseTo(700);
      expect(comisionArg.servicio_comision_monto).toBeCloseTo(300);
    });
  });

  // ── CASO FELIZ: con productos ─────────────────────────────────────────────

  describe('finalización con productos', () => {
    const productoConId = {
      id:              'vp-001',
      producto_id:     'prod-catalogo-001',
      nombre_producto: 'Shampoo',
      cantidad:        2,
      precio_unitario: 500,
      precio_total:    1000,
    };

    const productoSinId = {
      id:              'vp-002',
      nombre_producto: 'Producto genérico',
      cantidad:        1,
      precio_unitario: 200,
      precio_total:    200,
    };

    it('con producto_id: llama deleteByTurno, create y deductStock', async () => {
      const mocks = buildMocks();
      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoConfirmado());
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional());
      mocks.turnoRepo.finalizar.mockResolvedValue(buildTurnoFinalizado());
      mocks.comisionRepo.create.mockResolvedValue(buildComision());
      mocks.ventaProductoRepo.create.mockResolvedValue({} as any);

      await buildUseCase(mocks).execute(
        buildInputBase({ productos: [productoConId] })
      );

      expect(mocks.ventaProductoRepo.deleteByTurno).toHaveBeenCalledWith('turno-001');
      expect(mocks.ventaProductoRepo.create).toHaveBeenCalledTimes(1);
      expect(mocks.catalogoProductoRepo.deductStock).toHaveBeenCalledWith(
        'prod-catalogo-001',
        2
      );
    });

    it('sin producto_id: llama deleteByTurno y create pero NO deductStock', async () => {
      const mocks = buildMocks();
      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoConfirmado());
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional());
      mocks.turnoRepo.finalizar.mockResolvedValue(buildTurnoFinalizado());
      mocks.comisionRepo.create.mockResolvedValue(buildComision());
      mocks.ventaProductoRepo.create.mockResolvedValue({} as any);

      await buildUseCase(mocks).execute(
        buildInputBase({ productos: [productoSinId] })
      );

      expect(mocks.ventaProductoRepo.deleteByTurno).toHaveBeenCalledWith('turno-001');
      expect(mocks.ventaProductoRepo.create).toHaveBeenCalledTimes(1);
      expect(mocks.catalogoProductoRepo.deductStock).not.toHaveBeenCalled();
    });

    it('deleteByTurno se llama ANTES de create (orden garantizado)', async () => {
      const mocks = buildMocks();
      const callOrder: string[] = [];

      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoConfirmado());
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional());
      mocks.turnoRepo.finalizar.mockResolvedValue(buildTurnoFinalizado());
      mocks.comisionRepo.create.mockResolvedValue(buildComision());
      mocks.ventaProductoRepo.deleteByTurno.mockImplementation(async () => {
        callOrder.push('delete');
      });
      mocks.ventaProductoRepo.create.mockImplementation(async () => {
        callOrder.push('create');
        return {} as any;
      });

      await buildUseCase(mocks).execute(
        buildInputBase({ productos: [productoConId] })
      );

      expect(callOrder[0]).toBe('delete');
      expect(callOrder[1]).toBe('create');
    });

    it('con múltiples productos crea uno por cada ítem', async () => {
      const mocks = buildMocks();
      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoConfirmado());
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional());
      mocks.turnoRepo.finalizar.mockResolvedValue(buildTurnoFinalizado());
      mocks.comisionRepo.create.mockResolvedValue(buildComision());
      mocks.ventaProductoRepo.create.mockResolvedValue({} as any);

      await buildUseCase(mocks).execute(
        buildInputBase({ productos: [productoConId, productoSinId] })
      );

      expect(mocks.ventaProductoRepo.create).toHaveBeenCalledTimes(2);
    });
  });

  // ── DESCUENTO ─────────────────────────────────────────────────────────────

  describe('finalización con descuento', () => {
    it('10% de descuento sobre servicio: comision.servicio_monto usa precio con descuento', async () => {
      const mocks = buildMocks();
      // Precio 1000, descuento 10% → precio con descuento 900
      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoConfirmado({ precio: 1000 }));
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional({ comision_turno: 70 }));
      mocks.turnoRepo.finalizar.mockResolvedValue(buildTurnoFinalizado());
      mocks.comisionRepo.create.mockResolvedValue(buildComision());

      await buildUseCase(mocks).execute(
        buildInputBase({
          descuentoPorcentaje: 10,
          descuentoAplicarA: { servicio: true, productos: false },
        })
      );

      const comisionArg = mocks.comisionRepo.create.mock.calls[0][0];
      // servicio_monto debe ser 900 (precio con descuento aplicado)
      expect(comisionArg.servicio_monto).toBeCloseTo(900);
      expect(comisionArg.servicio_neto_profesional).toBeCloseTo(630); // 70% de 900
      expect(comisionArg.servicio_comision_monto).toBeCloseTo(270);   // 30% de 900
    });

    it('descuento correcto se refleja en turnoRepository.finalizar', async () => {
      const mocks = buildMocks();
      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoConfirmado({ precio: 1000 }));
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional());
      mocks.turnoRepo.finalizar.mockResolvedValue(buildTurnoFinalizado());
      mocks.comisionRepo.create.mockResolvedValue(buildComision());

      await buildUseCase(mocks).execute(
        buildInputBase({ descuentoPorcentaje: 10 })
      );

      const [, finalizarData] = mocks.turnoRepo.finalizar.mock.calls[0];
      expect(finalizarData.descuento_monto).toBeCloseTo(100);   // 10% de 1000
      expect(finalizarData.total_final).toBeCloseTo(900);
    });
  });

  // ── PRECIO MODIFICADO ─────────────────────────────────────────────────────

  describe('precioModificado', () => {
    it('usa precioModificado cuando es distinto al precio del turno', async () => {
      const mocks = buildMocks();
      // Turno con precio 1000, pero se cobra 800 (modificado)
      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoConfirmado({ precio: 1000 }));
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional({ comision_turno: 70 }));
      mocks.turnoRepo.finalizar.mockResolvedValue(buildTurnoFinalizado());
      mocks.comisionRepo.create.mockResolvedValue(buildComision());

      await buildUseCase(mocks).execute(
        buildInputBase({ precioModificado: 800 })
      );

      const comisionArg = mocks.comisionRepo.create.mock.calls[0][0];
      expect(comisionArg.servicio_monto).toBeCloseTo(800);
      expect(comisionArg.servicio_neto_profesional).toBeCloseTo(560); // 70% de 800
    });

    // BUG DOCUMENTADO: precioModificado = 0 usa turno.precio en vez de 0
    it('precioModificado=0 registra el servicio como $0 (servicio gratis)', async () => {
      const mocks = buildMocks();
      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoConfirmado({ precio: 1000 }));
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional({ comision_turno: 70 }));
      mocks.turnoRepo.finalizar.mockResolvedValue(buildTurnoFinalizado());
      mocks.comisionRepo.create.mockResolvedValue(buildComision());

      await buildUseCase(mocks).execute(
        buildInputBase({ precioModificado: 0 })
      );

      const comisionArg = mocks.comisionRepo.create.mock.calls[0][0];
      expect(comisionArg.servicio_monto).toBeCloseTo(0);
      expect(comisionArg.servicio_comision_monto).toBeCloseTo(0);
      expect(comisionArg.servicio_neto_profesional).toBeCloseTo(0);
    });
  });

  // ── CANJE (entrega gratis: todos los importes en 0) ───────────────────────

  describe('finalización con canje', () => {
    function setupCanje(mocks: ReturnType<typeof buildMocks>) {
      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoConfirmado({ precio: 1000 }));
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional({ comision_turno: 70, comision_producto: 50 }));
      mocks.turnoRepo.finalizar.mockResolvedValue(buildTurnoFinalizado());
      mocks.comisionRepo.create.mockResolvedValue(buildComision());
      mocks.ventaProductoRepo.create.mockResolvedValue({} as any);
    }

    it('metodoPago=canje: el turno se finaliza con total_final=0 y descuento_monto=0', async () => {
      const mocks = buildMocks();
      setupCanje(mocks);

      await buildUseCase(mocks).execute(buildInputBase({ metodoPago: 'canje' }));

      const [, finalizarData] = mocks.turnoRepo.finalizar.mock.calls[0];
      expect(finalizarData.metodoPago).toBe('canje');
      expect(finalizarData.total_final).toBeCloseTo(0);
      expect(finalizarData.descuento_monto).toBeCloseTo(0);
    });

    it('metodoPago=canje: la comisión del servicio se registra con todos los montos en 0', async () => {
      const mocks = buildMocks();
      setupCanje(mocks);

      await buildUseCase(mocks).execute(buildInputBase({ metodoPago: 'canje' }));

      const comisionArg = mocks.comisionRepo.create.mock.calls[0][0];
      expect(comisionArg.servicio_monto).toBeCloseTo(0);
      expect(comisionArg.servicio_comision_monto).toBeCloseTo(0);
      expect(comisionArg.servicio_neto_profesional).toBeCloseTo(0);
    });

    it('producto que hereda canje del turno: importes 0, costo_unitario_snapshot guardado y stock descontado', async () => {
      const mocks = buildMocks();
      setupCanje(mocks);
      mocks.catalogoProductoRepo.findById.mockResolvedValue({ id: 'prod-catalogo-001', costo: 40 } as any);

      await buildUseCase(mocks).execute(buildInputBase({
        metodoPago: 'canje',
        productos: [{
          id:              'vp-001',
          producto_id:     'prod-catalogo-001',
          nombre_producto: 'Shampoo',
          cantidad:        2,
          precio_unitario: 500,
          precio_total:    1000,
        }],
      }));

      const ventaArg = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(ventaArg.metodo_pago).toBe('canje');
      expect(ventaArg.precio_unitario).toBeCloseTo(0);
      expect(ventaArg.precio_total).toBeCloseTo(0);
      expect(ventaArg.comision_monto).toBeCloseTo(0);
      expect(ventaArg.neto_vendedor).toBeCloseTo(0);
      // El costo es informativo y SÍ se guarda
      expect(ventaArg.costo_unitario_snapshot).toBe(40);
      // El stock se descuenta normal
      expect(mocks.catalogoProductoRepo.deductStock).toHaveBeenCalledWith('prod-catalogo-001', 2);
    });

    it('producto con canje por-producto y servicio efectivo: solo el producto va en 0', async () => {
      const mocks = buildMocks();
      setupCanje(mocks);
      mocks.catalogoProductoRepo.findById.mockResolvedValue({ id: 'prod-catalogo-001', costo: 40 } as any);

      await buildUseCase(mocks).execute(buildInputBase({
        metodoPago: 'efectivo',
        productos: [{
          id:              'vp-001',
          producto_id:     'prod-catalogo-001',
          nombre_producto: 'Shampoo',
          cantidad:        1,
          precio_unitario: 500,
          precio_total:    500,
          metodo_pago:     'canje',
        }],
      }));

      // Servicio normal (1000, comisión 70% → 700 profesional / 300 empresa)
      const comisionArg = mocks.comisionRepo.create.mock.calls[0][0];
      expect(comisionArg.servicio_monto).toBeCloseTo(1000);
      expect(comisionArg.servicio_neto_profesional).toBeCloseTo(700);

      // El producto canjeado no aporta al total_final del turno
      const [, finalizarData] = mocks.turnoRepo.finalizar.mock.calls[0];
      expect(finalizarData.total_final).toBeCloseTo(1000);

      // Producto en 0
      const ventaArg = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(ventaArg.metodo_pago).toBe('canje');
      expect(ventaArg.precio_total).toBeCloseTo(0);
      expect(ventaArg.comision_monto).toBeCloseTo(0);
      expect(ventaArg.neto_vendedor).toBeCloseTo(0);
    });
  });

  // ── DETALLE DEL CANJE (texto libre persistido en turnos y venta_productos) ─

  describe('detalle del canje', () => {
    function setupCanje(mocks: ReturnType<typeof buildMocks>) {
      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoConfirmado({ precio: 1000 }));
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional({ comision_turno: 70, comision_producto: 50 }));
      mocks.turnoRepo.finalizar.mockResolvedValue(buildTurnoFinalizado());
      mocks.comisionRepo.create.mockResolvedValue(buildComision());
      mocks.ventaProductoRepo.create.mockResolvedValue({} as any);
    }

    it('servicio canje con canjeDetalle: el texto (con trim) llega a turnos.canje_detalle', async () => {
      const mocks = buildMocks();
      setupCanje(mocks);

      await buildUseCase(mocks).execute(buildInputBase({
        metodoPago: 'canje',
        canjeDetalle: '  Corte a cambio de publicidad en redes  ',
      }));

      const [, finalizarData] = mocks.turnoRepo.finalizar.mock.calls[0];
      expect(finalizarData.canje_detalle).toBe('Corte a cambio de publicidad en redes');
    });

    it('servicio NO canje: turnos.canje_detalle va en null aunque venga canjeDetalle', async () => {
      const mocks = buildMocks();
      setupCanje(mocks);

      await buildUseCase(mocks).execute(buildInputBase({
        metodoPago: 'efectivo',
        canjeDetalle: 'esto no debería guardarse',
      }));

      const [, finalizarData] = mocks.turnoRepo.finalizar.mock.calls[0];
      expect(finalizarData.canje_detalle).toBeNull();
    });

    it('canje sin canjeDetalle (o vacío): se guarda null', async () => {
      const mocks = buildMocks();
      setupCanje(mocks);

      await buildUseCase(mocks).execute(buildInputBase({
        metodoPago: 'canje',
        canjeDetalle: '   ',
      }));

      const [, finalizarData] = mocks.turnoRepo.finalizar.mock.calls[0];
      expect(finalizarData.metodoPago).toBe('canje');
      expect(finalizarData.canje_detalle).toBeNull();
    });

    it('un solo detalle por operación: el mismo texto va al turno y al producto canjeado', async () => {
      const mocks = buildMocks();
      setupCanje(mocks);
      mocks.catalogoProductoRepo.findById.mockResolvedValue({ id: 'prod-catalogo-001', costo: 40 } as any);

      await buildUseCase(mocks).execute(buildInputBase({
        metodoPago: 'canje',
        canjeDetalle: 'Canje por productos de la marca',
        productos: [{
          id:              'vp-001',
          producto_id:     'prod-catalogo-001',
          nombre_producto: 'Shampoo',
          cantidad:        1,
          precio_unitario: 500,
          precio_total:    500,
        }],
      }));

      const [, finalizarData] = mocks.turnoRepo.finalizar.mock.calls[0];
      expect(finalizarData.canje_detalle).toBe('Canje por productos de la marca');

      const ventaArg = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(ventaArg.canje_detalle).toBe('Canje por productos de la marca');
    });

    it('servicio efectivo + producto canje: el detalle solo va al producto, el turno queda null', async () => {
      const mocks = buildMocks();
      setupCanje(mocks);
      mocks.catalogoProductoRepo.findById.mockResolvedValue({ id: 'prod-catalogo-001', costo: 40 } as any);

      await buildUseCase(mocks).execute(buildInputBase({
        metodoPago: 'efectivo',
        canjeDetalle: 'Producto de regalo por colaboración',
        productos: [{
          id:              'vp-001',
          producto_id:     'prod-catalogo-001',
          nombre_producto: 'Shampoo',
          cantidad:        1,
          precio_unitario: 500,
          precio_total:    500,
          metodo_pago:     'canje',
        }],
      }));

      const [, finalizarData] = mocks.turnoRepo.finalizar.mock.calls[0];
      expect(finalizarData.canje_detalle).toBeNull();

      const ventaArg = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(ventaArg.canje_detalle).toBe('Producto de regalo por colaboración');
    });

    it('producto NO canje en turno canje: el producto se crea con canje_detalle null', async () => {
      const mocks = buildMocks();
      setupCanje(mocks);
      mocks.catalogoProductoRepo.findById.mockResolvedValue({ id: 'prod-catalogo-001', costo: 40 } as any);

      await buildUseCase(mocks).execute(buildInputBase({
        metodoPago: 'canje',
        canjeDetalle: 'Solo el servicio es canje',
        productos: [{
          id:              'vp-001',
          producto_id:     'prod-catalogo-001',
          nombre_producto: 'Shampoo',
          cantidad:        1,
          precio_unitario: 500,
          precio_total:    500,
          metodo_pago:     'efectivo',
        }],
      }));

      const ventaArg = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(ventaArg.metodo_pago).toBe('efectivo');
      expect(ventaArg.canje_detalle).toBeNull();
    });

    it('el detalle se trunca a 500 caracteres', async () => {
      const mocks = buildMocks();
      setupCanje(mocks);

      await buildUseCase(mocks).execute(buildInputBase({
        metodoPago: 'canje',
        canjeDetalle: 'x'.repeat(600),
      }));

      const [, finalizarData] = mocks.turnoRepo.finalizar.mock.calls[0];
      expect(finalizarData.canje_detalle).toHaveLength(500);
    });
  });
});
