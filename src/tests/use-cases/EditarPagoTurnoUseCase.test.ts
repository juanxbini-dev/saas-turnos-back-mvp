/**
 * Tests unitarios de EditarPagoTurnoUseCase.
 *
 * Diferencias clave con FinalizarTurnoUseCase:
 *   - Opera sobre turnos en estado 'completado' (no 'confirmado')
 *   - Llama updateByTurno (no create) en comisionRepository
 *   - NO establece finalizado_at ni finalizado_por_id
 *   - productos=undefined → no toca venta_productos
 *   - productos=[]        → deleteByTurno pero no create
 *
 * BUG CRÍTICO DOCUMENTADO:
 *   Si el turno fue completado por el cron (CompletarTurnosVencidosUseCase),
 *   no tiene fila en comisiones_turno. updateByTurno hace UPDATE WHERE turno_id=X
 *   → 0 filas afectadas → retorna undefined → la comisión nunca se crea.
 *   El turno queda invisible en finanzas (INNER JOIN comisiones_turno lo excluye).
 */

import { EditarPagoTurnoUseCase }    from '../../application/use-cases/turnos/EditarPagoTurnoUseCase';
import { ITurnoRepository }          from '../../domain/repositories/ITurnoRepository';
import { IUsuarioRepository }        from '../../domain/repositories/IUsuarioRepository';
import { IComisionRepository }       from '../../domain/repositories/IComisionRepository';
import { IVentaProductoRepository }  from '../../domain/repositories/IVentaProductoRepository';
import { IProductoRepository }       from '../../domain/repositories/IProductoRepository';
import { TurnoConDetalle, EditarPagoData, Turno } from '../../domain/entities/Turno';
import { UsuarioPublico }            from '../../domain/entities/User';
import { ComisionTurno }             from '../../domain/entities/Comision';

// ── Factories ─────────────────────────────────────────────────────────────────

function buildTurnoCompletado(overrides: Partial<TurnoConDetalle> = {}): TurnoConDetalle {
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
    updated_at:      '2026-05-08T10:00:00.000Z',
    cliente_nombre:  'Ana López',
    cliente_email:   'ana@test.com',
    usuario_nombre:  'Carlos Gómez',
    usuario_username: 'cgomez',
    ...overrides,
  };
}

function buildTurnoActualizado(base: Partial<Turno> = {}): Turno {
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
    updated_at:      '2026-05-08T11:00:00.000Z',
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
    created_at:                  '2026-05-08T10:00:00.000Z',
    updated_at:                  '2026-05-08T11:00:00.000Z',
  };
}

function buildInputBase(overrides: Partial<EditarPagoData> = {}): EditarPagoData {
  return {
    turnoId:      'turno-001',
    profesionalId: 'prof-001',
    empresaId:    'empresa-001',
    metodoPago:   'efectivo',
    ...overrides,
  };
}

// ── Factory de mocks ──────────────────────────────────────────────────────────

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
  return new EditarPagoTurnoUseCase(
    mocks.turnoRepo,
    mocks.usuarioRepo,
    mocks.comisionRepo,
    mocks.ventaProductoRepo,
    mocks.catalogoProductoRepo
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('EditarPagoTurnoUseCase', () => {

  // ── CASOS DE ERROR ────────────────────────────────────────────────────────

  describe('casos de error', () => {
    it('lanza 404 si el turno no existe', async () => {
      const mocks = buildMocks();
      mocks.turnoRepo.findById.mockResolvedValue(null);

      await expect(buildUseCase(mocks).execute(buildInputBase()))
        .rejects.toMatchObject({ message: 'Turno no encontrado', statusCode: 404 });
    });

    it('lanza 400 si el turno está confirmado (no completado)', async () => {
      const mocks = buildMocks();
      mocks.turnoRepo.findById.mockResolvedValue(
        buildTurnoCompletado({ estado: 'confirmado' })
      );

      await expect(buildUseCase(mocks).execute(buildInputBase()))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza 400 si el turno está cancelado', async () => {
      const mocks = buildMocks();
      mocks.turnoRepo.findById.mockResolvedValue(
        buildTurnoCompletado({ estado: 'cancelado' })
      );

      await expect(buildUseCase(mocks).execute(buildInputBase()))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza 400 si el turno está pendiente', async () => {
      const mocks = buildMocks();
      mocks.turnoRepo.findById.mockResolvedValue(
        buildTurnoCompletado({ estado: 'pendiente' })
      );

      await expect(buildUseCase(mocks).execute(buildInputBase()))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza 404 si el profesional no existe', async () => {
      const mocks = buildMocks();
      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoCompletado());
      mocks.usuarioRepo.findById.mockResolvedValue(null);

      await expect(buildUseCase(mocks).execute(buildInputBase()))
        .rejects.toMatchObject({ message: 'Profesional no encontrado', statusCode: 404 });
    });
  });

  // ── CASO FELIZ: edición básica ────────────────────────────────────────────

  describe('edición básica de pago', () => {
    it('llama updateByTurno con los campos recalculados y retorna el turno actualizado', async () => {
      const mocks = buildMocks();
      const turnoActualizado = buildTurnoActualizado();

      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoCompletado());
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional({ comision_turno: 70 }));
      mocks.turnoRepo.finalizar.mockResolvedValue(turnoActualizado);
      mocks.comisionRepo.updateByTurno.mockResolvedValue(buildComision());

      const resultado = await buildUseCase(mocks).execute(buildInputBase());

      expect(resultado).toBe(turnoActualizado);
      expect(mocks.comisionRepo.updateByTurno).toHaveBeenCalledTimes(1);
      expect(mocks.comisionRepo.create).not.toHaveBeenCalled();

      const [turnoId, updateData] = mocks.comisionRepo.updateByTurno.mock.calls[0];
      expect(turnoId).toBe('turno-001');
      expect(updateData.servicio_monto).toBeCloseTo(1000);
      expect(updateData.servicio_neto_profesional).toBeCloseTo(700);
      expect(updateData.servicio_comision_monto).toBeCloseTo(300);
    });

    it('NO establece finalizado_at ni finalizado_por_id en turnoRepository.finalizar', async () => {
      const mocks = buildMocks();
      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoCompletado());
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional());
      mocks.turnoRepo.finalizar.mockResolvedValue(buildTurnoActualizado());
      mocks.comisionRepo.updateByTurno.mockResolvedValue(buildComision());

      await buildUseCase(mocks).execute(buildInputBase());

      const [, finalizarData] = mocks.turnoRepo.finalizar.mock.calls[0];
      expect(finalizarData).not.toHaveProperty('finalizado_at');
      expect(finalizarData).not.toHaveProperty('finalizado_por_id');
    });

    it('recalcula comisión correctamente cuando cambia el precioModificado', async () => {
      const mocks = buildMocks();
      // Precio original en turno = 1000, se edita a 800
      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoCompletado({ precio: 1000 }));
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional({ comision_turno: 70 }));
      mocks.turnoRepo.finalizar.mockResolvedValue(buildTurnoActualizado());
      mocks.comisionRepo.updateByTurno.mockResolvedValue(buildComision());

      await buildUseCase(mocks).execute(
        buildInputBase({ precioModificado: 800 })
      );

      const [, updateData] = mocks.comisionRepo.updateByTurno.mock.calls[0];
      expect(updateData.servicio_monto).toBeCloseTo(800);
      expect(updateData.servicio_neto_profesional).toBeCloseTo(560); // 70% de 800
      expect(updateData.servicio_comision_monto).toBeCloseTo(240);   // 30% de 800
    });
  });

  // ── PRODUCTOS ─────────────────────────────────────────────────────────────

  describe('manejo de productos', () => {
    const unProducto = {
      id:              'vp-001',
      nombre_producto: 'Shampoo',
      cantidad:        1,
      precio_unitario: 300,
      precio_total:    300,
    };

    function setupHappyPath(mocks: ReturnType<typeof buildMocks>) {
      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoCompletado());
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional());
      mocks.turnoRepo.finalizar.mockResolvedValue(buildTurnoActualizado());
      mocks.comisionRepo.updateByTurno.mockResolvedValue(buildComision());
      mocks.ventaProductoRepo.create.mockResolvedValue({} as any);
    }

    it('productos = undefined → no toca ventaProductoRepo', async () => {
      const mocks = buildMocks();
      setupHappyPath(mocks);

      await buildUseCase(mocks).execute(buildInputBase({ productos: undefined }));

      expect(mocks.ventaProductoRepo.deleteByTurno).not.toHaveBeenCalled();
      expect(mocks.ventaProductoRepo.create).not.toHaveBeenCalled();
    });

    it('productos = [] → deleteByTurno pero no create (borra sin recrear)', async () => {
      const mocks = buildMocks();
      setupHappyPath(mocks);

      await buildUseCase(mocks).execute(buildInputBase({ productos: [] }));

      expect(mocks.ventaProductoRepo.deleteByTurno).toHaveBeenCalledWith('turno-001');
      expect(mocks.ventaProductoRepo.create).not.toHaveBeenCalled();
    });

    it('productos con ítems → deleteByTurno + create por cada producto', async () => {
      const mocks = buildMocks();
      setupHappyPath(mocks);

      await buildUseCase(mocks).execute(buildInputBase({ productos: [unProducto, unProducto] }));

      expect(mocks.ventaProductoRepo.deleteByTurno).toHaveBeenCalledWith('turno-001');
      expect(mocks.ventaProductoRepo.create).toHaveBeenCalledTimes(2);
    });

    it('el producto creado incluye los campos de comisión calculados correctamente', async () => {
      const mocks = buildMocks();
      setupHappyPath(mocks);
      // Comisión producto 50%: profesional recibe 50, empresa 50
      mocks.usuarioRepo.findById.mockResolvedValue(
        buildProfesional({ comision_producto: 50 })
      );

      await buildUseCase(mocks).execute(buildInputBase({ productos: [unProducto] }));

      const productoCreado = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(productoCreado.precio_total).toBe(300);
      expect(productoCreado.neto_vendedor).toBeCloseTo(150);   // 50% de 300
      expect(productoCreado.comision_monto).toBeCloseTo(150);  // 50% de 300
      expect(productoCreado.comision_porcentaje).toBe(50);
    });
  });

  // ── DETALLE DEL CANJE ─────────────────────────────────────────────────────

  describe('detalle del canje', () => {
    function setupHappyPath(mocks: ReturnType<typeof buildMocks>) {
      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoCompletado());
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional());
      mocks.turnoRepo.finalizar.mockResolvedValue(buildTurnoActualizado());
      mocks.comisionRepo.updateByTurno.mockResolvedValue(buildComision());
      mocks.ventaProductoRepo.create.mockResolvedValue({} as any);
    }

    it('editar a canje con canjeDetalle: el texto (con trim) va a turnos.canje_detalle', async () => {
      const mocks = buildMocks();
      setupHappyPath(mocks);

      await buildUseCase(mocks).execute(buildInputBase({
        metodoPago:   'canje',
        canjeDetalle: '  A cambio de mercadería  ',
      }));

      const [, finalizarData] = mocks.turnoRepo.finalizar.mock.calls[0];
      expect(finalizarData.metodoPago).toBe('canje');
      expect(finalizarData.canje_detalle).toBe('A cambio de mercadería');
    });

    it('el servicio deja de ser canje: turnos.canje_detalle vuelve a NULL', async () => {
      const mocks = buildMocks();
      setupHappyPath(mocks);

      // El turno estaba cobrado como canje y se edita a efectivo
      mocks.turnoRepo.findById.mockResolvedValue(
        buildTurnoCompletado({ metodo_pago: 'canje', canje_detalle: 'canje viejo' })
      );

      await buildUseCase(mocks).execute(buildInputBase({ metodoPago: 'efectivo' }));

      const [, finalizarData] = mocks.turnoRepo.finalizar.mock.calls[0];
      expect(finalizarData.canje_detalle).toBeNull();
    });

    it('producto canjeado en la edición: se recrea con el canje_detalle de la operación', async () => {
      const mocks = buildMocks();
      setupHappyPath(mocks);

      await buildUseCase(mocks).execute(buildInputBase({
        metodoPago:   'canje',
        canjeDetalle: 'Canje completo del turno',
        productos: [{
          id:              'vp-001',
          nombre_producto: 'Shampoo',
          cantidad:        1,
          precio_unitario: 300,
          precio_total:    300,
        }],
      }));

      const productoCreado = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(productoCreado.metodo_pago).toBe('canje');
      expect(productoCreado.canje_detalle).toBe('Canje completo del turno');
    });

    it('producto que deja de ser canje: se recrea con canje_detalle null', async () => {
      const mocks = buildMocks();
      setupHappyPath(mocks);

      await buildUseCase(mocks).execute(buildInputBase({
        metodoPago: 'efectivo',
        productos: [{
          id:              'vp-001',
          nombre_producto: 'Shampoo',
          cantidad:        1,
          precio_unitario: 300,
          precio_total:    300,
          metodo_pago:     'efectivo',
        }],
      }));

      const [, finalizarData] = mocks.turnoRepo.finalizar.mock.calls[0];
      expect(finalizarData.canje_detalle).toBeNull();

      const productoCreado = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(productoCreado.canje_detalle).toBeNull();
    });
  });

  // ── BUG CRÍTICO: turno completado por cron sin comisión ───────────────────
  //
  // Escenario:
  //   1. El cron completa el turno (CompletarTurnosVencidosUseCase)
  //   2. No se crea comisión_turno → la tabla comisiones_turno no tiene fila
  //   3. Admin edita el pago con EditarPagoTurnoUseCase
  //   4. updateByTurno hace UPDATE WHERE turno_id='turno-001' → 0 filas
  //   5. El repositorio Postgres retorna result.rows[0] = undefined
  //   6. La comisión NUNCA se crea → el turno queda invisible en finanzas
  //      porque GetFinanzasUseCase hace INNER JOIN comisiones_turno

  describe('BUG: turno completado por cron sin comision_turno', () => {
    it('updateByTurno retorna undefined cuando no hay fila → turno queda sin comisión', async () => {
      const mocks = buildMocks();

      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoCompletado());
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional());
      mocks.turnoRepo.finalizar.mockResolvedValue(buildTurnoActualizado());

      // BUG: updateByTurno retorna undefined porque no hay fila en comisiones_turno
      // (el turno fue completado por el cron, nunca tuvo comisión)
      mocks.comisionRepo.updateByTurno.mockResolvedValue(undefined as any);

      // El use case ejecuta sin lanzar error — éste es el comportamiento defectuoso:
      // no detecta que el UPDATE no afectó ninguna fila y no crea la comisión.
      const resultado = await buildUseCase(mocks).execute(buildInputBase());

      // El turno sí se actualiza...
      expect(resultado).toBeDefined();

      // ...pero comisionRepository.create NUNCA se llama → la comisión no existe
      expect(mocks.comisionRepo.create).not.toHaveBeenCalled();

      // updateByTurno fue llamado, pero silenciosamente falló sin fila afectada
      expect(mocks.comisionRepo.updateByTurno).toHaveBeenCalledTimes(1);

      // CONSECUENCIA: si ahora consultáramos finanzas, el turno sería invisible
      // porque GetFinanzasUseCase (SQL): INNER JOIN comisiones_turno ct ON ct.turno_id = t.id
      // no devuelve filas para turnos sin comisión.
    });

    it('DOCUMENTA: el use case no verifica el resultado de updateByTurno', async () => {
      // Este test confirma que el use case NO lanza error cuando updateByTurno
      // retorna undefined, lo que muestra la ausencia de validación post-update.
      const mocks = buildMocks();
      mocks.turnoRepo.findById.mockResolvedValue(buildTurnoCompletado());
      mocks.usuarioRepo.findById.mockResolvedValue(buildProfesional());
      mocks.turnoRepo.finalizar.mockResolvedValue(buildTurnoActualizado());
      mocks.comisionRepo.updateByTurno.mockResolvedValue(undefined as any);

      // No debe lanzar ningún error — pero debería (bug)
      await expect(buildUseCase(mocks).execute(buildInputBase())).resolves.toBeDefined();
    });
  });
});
