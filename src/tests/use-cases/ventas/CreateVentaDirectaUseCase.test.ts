/**
 * Tests unitarios de CreateVentaDirectaUseCase.
 *
 * Cubre la lógica crítica de cálculo financiero para ventas directas:
 *   precio_total    = cantidad × precio_unitario
 *   ganancia        = max(0, precio_total − costo_unitario × cantidad)
 *   neto_vendedor   = ganancia × comision_porcentaje / 100  ← lo que recibe el profesional
 *   comision_monto  = precio_total - neto_vendedor           ← lo que retiene la empresa
 * Si el costo es desconocido (null), se asume 0 y la base vuelve a ser el precio total.
 *
 * También verifica multi-tenancy, manejo de stock, fecha_venta y casos de error.
 */

import { CreateVentaDirectaUseCase, CreateVentaDirectaData } from '../../../application/use-cases/ventas/CreateVentaDirectaUseCase';
import { IVentaProductoRepository } from '../../../domain/repositories/IVentaProductoRepository';
import { IUsuarioRepository } from '../../../domain/repositories/IUsuarioRepository';
import { IProductoRepository } from '../../../domain/repositories/IProductoRepository';
import { VentaProducto } from '../../../domain/entities/Comision';
import { UsuarioPublico } from '../../../domain/entities/User';
import { Producto } from '../../../domain/entities/Producto';

// ── Factories ─────────────────────────────────────────────────────────────────

function buildVendedor(overrides: Partial<UsuarioPublico> = {}): UsuarioPublico {
  return {
    id:               'vendedor-001',
    email:            'vendedor@test.com',
    nombre:           'Laura Perez',
    username:         'lperez',
    empresa_id:       'empresa-001',
    roles:            ['staff'],
    activo:           true,
    last_login:       null,
    created_at:       '2026-01-01T00:00:00.000Z',
    updated_at:       '2026-01-01T00:00:00.000Z',
    comision_turno:   30,
    comision_producto: 10,
    ...overrides,
  };
}

function buildProductoCatalogo(overrides: Partial<Producto> = {}): Producto {
  return {
    id:                   'prod-001',
    empresa_id:           'empresa-001',
    nombre:               'Shampoo Premium',
    descripcion:          null,
    precio_efectivo:      100,
    precio_transferencia: 110,
    precio_tarjeta:       null,
    costo:                40,
    stock:                50,
    activo:               true,
    marca_id:             null,
    marca_nombre:         null,
    created_at:           '2026-01-01T00:00:00.000Z',
    updated_at:           '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function buildVentaCreada(overrides: Partial<VentaProducto> = {}): VentaProducto {
  return {
    id:                   'venta-001',
    empresa_id:           'empresa-001',
    vendedor_id:          'vendedor-001',
    cliente_id:           null,
    turno_id:             null,
    venta_grupo_id:       'grupo-abc',
    producto_id:          'prod-001',
    nombre_producto:      'Shampoo Premium',
    cantidad:             1,
    precio_unitario:      100,
    precio_total:         100,
    metodo_pago:          'efectivo',
    comision_porcentaje:  10,
    comision_monto:       90,
    neto_vendedor:        10,
    fecha_venta:          null,
    es_venta_costo:       false,
    costo_unitario_snapshot: null,
    created_at:           '2026-05-08T10:00:00.000Z',
    updated_at:           '2026-05-08T10:00:00.000Z',
    ...overrides,
  };
}

function buildInputBase(overrides: Partial<CreateVentaDirectaData> = {}): CreateVentaDirectaData {
  return {
    empresa_id:  'empresa-001',
    vendedor_id: 'vendedor-001',
    cliente_id:  null,
    metodo_pago: 'efectivo',
    items: [
      {
        producto_id:    'prod-001',
        cantidad:       1,
        precio_unitario: 100,
      },
    ],
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

  const usuarioRepo: jest.Mocked<IUsuarioRepository> = {
    findByEmpresa:               jest.fn(),
    findById:                    jest.fn(),
    findByIdWithPassword:        jest.fn(),
    create:                      jest.fn(),
    updateDatos:                 jest.fn(),
    updatePassword:              jest.fn(),
    updateRol:                   jest.fn(),
    delete:                      jest.fn(),
    existeUsername:              jest.fn(),
    existeEmail:                 jest.fn(),
    findProfesionalesByEmpresa:  jest.fn(),
    countProfesionalesByEmpresa: jest.fn(),
    updateAvatar:                jest.fn(),
  };

  const catalogoRepo: jest.Mocked<IProductoRepository> = {
    findAll:          jest.fn(),
    findById:         jest.fn(),
    create:           jest.fn(),
    update:           jest.fn(),
    addStock:         jest.fn(),
    deductStock:      jest.fn(),
    delete:           jest.fn(),
    findByNombre:     jest.fn(),
    findBajoStock:    jest.fn(),
    getTopVendidos:   jest.fn(),
    getTopVendedores: jest.fn(),
    getVentasFinanzas: jest.fn(),
    resetPreciosManuales: jest.fn(),
    countManualesSinCosto: jest.fn(),
  };

  return { ventaProductoRepo, usuarioRepo, catalogoRepo };
}

function buildUseCase(
  mocks: ReturnType<typeof makeMocks>,
  conCatalogo = true
) {
  return new CreateVentaDirectaUseCase(
    mocks.ventaProductoRepo,
    mocks.usuarioRepo,
    conCatalogo ? mocks.catalogoRepo : undefined
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('CreateVentaDirectaUseCase', () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── CÁLCULOS FINANCIEROS ──────────────────────────────────────────────────

  describe('cálculos financieros', () => {

    it('comisión 10% sobre ganancia: precio 100, costo 40, cant 1 → neto_vendedor=6, comision_monto=94', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 10 }));
      mocks.catalogoRepo.findById.mockResolvedValue(buildProductoCatalogo());
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada());

      await buildUseCase(mocks).execute(buildInputBase());

      const argCreado = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(argCreado.precio_total).toBeCloseTo(100);
      expect(argCreado.neto_vendedor).toBeCloseTo(6);       // ganancia 60 × 10%
      expect(argCreado.comision_monto).toBeCloseTo(94);     // 100 - 6
      expect(argCreado.comision_porcentaje).toBe(10);
      expect(argCreado.costo_unitario_snapshot).toBe(40);
    });

    it('comisión 80% sobre ganancia: precio 200, costo 40, cant 2 → neto_vendedor=256, comision_monto=144', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 80 }));
      mocks.catalogoRepo.findById.mockResolvedValue(buildProductoCatalogo({ nombre: 'Tinte' }));
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada());

      await buildUseCase(mocks).execute(buildInputBase({
        items: [{ producto_id: 'prod-001', cantidad: 2, precio_unitario: 200 }],
      }));

      const argCreado = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(argCreado.precio_total).toBeCloseTo(400);      // 2 × 200
      expect(argCreado.neto_vendedor).toBeCloseTo(256);     // ganancia (400 - 80) × 80%
      expect(argCreado.comision_monto).toBeCloseTo(144);    // 400 - 256
      expect(argCreado.comision_porcentaje).toBe(80);
    });

    it('costo desconocido (null en catálogo): la base de la comisión vuelve a ser el precio total', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 10 }));
      mocks.catalogoRepo.findById.mockResolvedValue(buildProductoCatalogo({ costo: null }));
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada());

      await buildUseCase(mocks).execute(buildInputBase());

      const argCreado = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(argCreado.neto_vendedor).toBeCloseTo(10);      // sin costo → base = 100
      expect(argCreado.comision_monto).toBeCloseTo(90);
      expect(argCreado.costo_unitario_snapshot).toBeNull();
    });

    it('venta por debajo del costo: ganancia negativa se trunca en 0 → neto_vendedor=0', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 50 }));
      mocks.catalogoRepo.findById.mockResolvedValue(buildProductoCatalogo({ costo: 40 }));
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada());

      await buildUseCase(mocks).execute(buildInputBase({
        items: [{ producto_id: 'prod-001', cantidad: 1, precio_unitario: 30 }],
      }));

      const argCreado = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(argCreado.neto_vendedor).toBeCloseTo(0);
      expect(argCreado.comision_monto).toBeCloseTo(30);
    });

    it('comisión 0%: empresa se queda con todo, profesional recibe 0', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 0 }));
      mocks.catalogoRepo.findById.mockResolvedValue(buildProductoCatalogo());
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada());

      await buildUseCase(mocks).execute(buildInputBase({
        items: [{ producto_id: 'prod-001', cantidad: 1, precio_unitario: 500 }],
      }));

      const argCreado = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(argCreado.precio_total).toBeCloseTo(500);
      expect(argCreado.neto_vendedor).toBeCloseTo(0);
      expect(argCreado.comision_monto).toBeCloseTo(500);
    });

    it('comisión 100%: profesional se queda con toda la ganancia, empresa retiene el costo', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 100 }));
      mocks.catalogoRepo.findById.mockResolvedValue(buildProductoCatalogo());
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada());

      await buildUseCase(mocks).execute(buildInputBase({
        items: [{ producto_id: 'prod-001', cantidad: 3, precio_unitario: 250 }],
      }));

      const argCreado = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(argCreado.precio_total).toBeCloseTo(750);      // 3 × 250
      expect(argCreado.neto_vendedor).toBeCloseTo(630);     // ganancia 750 - 120
      expect(argCreado.comision_monto).toBeCloseTo(120);    // la empresa recupera el costo
    });

  });

  // ── MÚLTIPLES ÍTEMS ───────────────────────────────────────────────────────

  describe('múltiples ítems', () => {

    it('todos los ítems comparten el mismo venta_grupo_id', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 10 }));
      mocks.catalogoRepo.findById.mockResolvedValue(buildProductoCatalogo());
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada());

      await buildUseCase(mocks).execute(buildInputBase({
        items: [
          { producto_id: 'prod-001', cantidad: 1, precio_unitario: 100 },
          { producto_id: 'prod-002', cantidad: 2, precio_unitario: 50 },
          { producto_id: 'prod-003', cantidad: 1, precio_unitario: 200 },
        ],
      }));

      expect(mocks.ventaProductoRepo.create).toHaveBeenCalledTimes(3);

      const grupoId0 = mocks.ventaProductoRepo.create.mock.calls[0][0].venta_grupo_id;
      const grupoId1 = mocks.ventaProductoRepo.create.mock.calls[1][0].venta_grupo_id;
      const grupoId2 = mocks.ventaProductoRepo.create.mock.calls[2][0].venta_grupo_id;

      expect(grupoId0).toBeTruthy();
      expect(grupoId0).toBe(grupoId1);
      expect(grupoId0).toBe(grupoId2);
    });

  });

  // ── FECHA_VENTA ───────────────────────────────────────────────────────────

  describe('fecha_venta', () => {

    it('cuando el ítem no tiene fecha_venta, se pasa null al repo', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 10 }));
      mocks.catalogoRepo.findById.mockResolvedValue(buildProductoCatalogo());
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada());

      await buildUseCase(mocks).execute(buildInputBase({
        items: [{ producto_id: 'prod-001', cantidad: 1, precio_unitario: 100 }],
      }));

      const argCreado = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(argCreado.fecha_venta).toBeNull();
    });

    it('cuando el ítem tiene fecha_venta propia, esa fecha se propaga al repo', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 10 }));
      mocks.catalogoRepo.findById.mockResolvedValue(buildProductoCatalogo());
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada());

      await buildUseCase(mocks).execute(buildInputBase({
        items: [{
          producto_id:    'prod-001',
          cantidad:       1,
          precio_unitario: 100,
          fecha_venta:    '2026-04-15',
        }],
      }));

      const argCreado = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(argCreado.fecha_venta).toBe('2026-04-15');
    });

    it('en múltiples ítems, cada uno puede tener su propia fecha_venta independiente', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 10 }));
      mocks.catalogoRepo.findById.mockResolvedValue(buildProductoCatalogo());
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada());

      await buildUseCase(mocks).execute(buildInputBase({
        items: [
          { producto_id: 'prod-001', cantidad: 1, precio_unitario: 100, fecha_venta: '2026-04-01' },
          { producto_id: 'prod-002', cantidad: 1, precio_unitario: 200, fecha_venta: '2026-04-15' },
        ],
      }));

      const fecha0 = mocks.ventaProductoRepo.create.mock.calls[0][0].fecha_venta;
      const fecha1 = mocks.ventaProductoRepo.create.mock.calls[1][0].fecha_venta;
      expect(fecha0).toBe('2026-04-01');
      expect(fecha1).toBe('2026-04-15');
    });

  });

  // ── ES_VENTA_COSTO ────────────────────────────────────────────────────────

  describe('es_venta_costo', () => {

    it('es_venta_costo=true: costo_unitario_snapshot se almacena con el precio_costo enviado', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 10 }));
      mocks.catalogoRepo.findById.mockResolvedValue(buildProductoCatalogo());
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada());

      await buildUseCase(mocks).execute(buildInputBase({
        items: [{
          producto_id:    'prod-001',
          cantidad:       1,
          precio_unitario: 100,
          precio_costo:   35,
          es_venta_costo: true,
        }],
      }));

      const argCreado = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(argCreado.es_venta_costo).toBe(true);
      expect(argCreado.costo_unitario_snapshot).toBe(35);
    });

    it('es_venta_costo=false: costo_unitario_snapshot toma el costo del catálogo (ignora precio_costo)', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 10 }));
      mocks.catalogoRepo.findById.mockResolvedValue(buildProductoCatalogo());
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada());

      await buildUseCase(mocks).execute(buildInputBase({
        items: [{
          producto_id:    'prod-001',
          cantidad:       1,
          precio_unitario: 100,
          precio_costo:   35,
          es_venta_costo: false,
        }],
      }));

      const argCreado = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(argCreado.es_venta_costo).toBe(false);
      expect(argCreado.costo_unitario_snapshot).toBe(40);
    });

  });

  // ── STOCK ─────────────────────────────────────────────────────────────────

  describe('deducción de stock', () => {

    it('con catálogo: deductStock se llama por cada ítem con su producto_id y cantidad', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 10 }));
      mocks.catalogoRepo.findById.mockResolvedValue(buildProductoCatalogo());
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada());

      await buildUseCase(mocks).execute(buildInputBase({
        items: [
          { producto_id: 'prod-001', cantidad: 3, precio_unitario: 100 },
          { producto_id: 'prod-002', cantidad: 1, precio_unitario: 50 },
        ],
      }));

      expect(mocks.catalogoRepo.deductStock).toHaveBeenCalledTimes(2);
      expect(mocks.catalogoRepo.deductStock).toHaveBeenCalledWith('prod-001', 3);
      expect(mocks.catalogoRepo.deductStock).toHaveBeenCalledWith('prod-002', 1);
    });

    it('sin catálogo (undefined): no llama deductStock y la venta se crea igual', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 10 }));
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada());

      const useCase = buildUseCase(mocks, false);
      const resultado = await useCase.execute(buildInputBase());

      expect(mocks.catalogoRepo.deductStock).not.toHaveBeenCalled();
      expect(resultado).toHaveLength(1);
    });

    it('con catálogo pero producto no encontrado: usa nombre por defecto y sí llama deductStock', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 10 }));
      // findById retorna null → producto no está en catálogo
      mocks.catalogoRepo.findById.mockResolvedValue(null);
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada());

      await buildUseCase(mocks).execute(buildInputBase());

      const argCreado = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(argCreado.nombre_producto).toBe('Producto prod-001');
      // deductStock igualmente se llama (el use case no verifica si existe)
      expect(mocks.catalogoRepo.deductStock).toHaveBeenCalledWith('prod-001', 1);
    });

  });

  // ── ÍTEM SIN PRODUCTO_ID ──────────────────────────────────────────────────

  describe('ítem sin producto_id', () => {

    it('se crea con producto_id=null y nombre_producto manual, sin llamar deductStock', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 20 }));
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada({ producto_id: null, nombre_producto: 'Servicio extra' }));

      // Pasamos un ítem sin producto_id — el tipo lo permite como campo opcional
      const data: CreateVentaDirectaData = {
        empresa_id:  'empresa-001',
        vendedor_id: 'vendedor-001',
        cliente_id:  null,
        metodo_pago: 'efectivo',
        items: [
          {
            producto_id:    null as any, // sin producto_id
            cantidad:       1,
            precio_unitario: 150,
          },
        ],
      };

      const useCase = buildUseCase(mocks, false); // sin catálogo
      const resultado = await useCase.execute(data);

      expect(resultado).toHaveLength(1);
      expect(mocks.catalogoRepo.deductStock).not.toHaveBeenCalled();
    });

  });

  // ── MULTI-TENANCY ─────────────────────────────────────────────────────────

  describe('multi-tenancy', () => {

    it('empresa_id del input se pasa correctamente a cada venta creada', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ empresa_id: 'empresa-XYZ', comision_producto: 15 }));
      mocks.catalogoRepo.findById.mockResolvedValue(buildProductoCatalogo());
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada({ empresa_id: 'empresa-XYZ' }));

      await buildUseCase(mocks).execute(buildInputBase({
        empresa_id: 'empresa-XYZ',
        items: [
          { producto_id: 'prod-001', cantidad: 1, precio_unitario: 100 },
          { producto_id: 'prod-002', cantidad: 2, precio_unitario: 50 },
        ],
      }));

      expect(mocks.ventaProductoRepo.create).toHaveBeenCalledTimes(2);
      for (const call of mocks.ventaProductoRepo.create.mock.calls) {
        expect(call[0].empresa_id).toBe('empresa-XYZ');
      }
    });

    it('vendedor_id del input se propaga a todos los ítems creados', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ id: 'vendedor-999', comision_producto: 10 }));
      mocks.catalogoRepo.findById.mockResolvedValue(buildProductoCatalogo());
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada({ vendedor_id: 'vendedor-999' }));

      await buildUseCase(mocks).execute(buildInputBase({
        vendedor_id: 'vendedor-999',
        items: [
          { producto_id: 'prod-001', cantidad: 1, precio_unitario: 100 },
          { producto_id: 'prod-002', cantidad: 1, precio_unitario: 200 },
        ],
      }));

      for (const call of mocks.ventaProductoRepo.create.mock.calls) {
        expect(call[0].vendedor_id).toBe('vendedor-999');
      }
    });

  });

  // ── CASOS DE ERROR ────────────────────────────────────────────────────────

  describe('casos de error', () => {

    it('lanza 400 si items está vacío', async () => {
      const mocks = makeMocks();

      await expect(buildUseCase(mocks).execute(buildInputBase({ items: [] })))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza 400 si items no está definido', async () => {
      const mocks = makeMocks();

      await expect(buildUseCase(mocks).execute(buildInputBase({ items: undefined as any })))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza 400 si cantidad es 0', async () => {
      const mocks = makeMocks();

      await expect(buildUseCase(mocks).execute(buildInputBase({
        items: [{ producto_id: 'prod-001', cantidad: 0, precio_unitario: 100 }],
      }))).rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza 400 si cantidad es negativa', async () => {
      const mocks = makeMocks();

      await expect(buildUseCase(mocks).execute(buildInputBase({
        items: [{ producto_id: 'prod-001', cantidad: -1, precio_unitario: 100 }],
      }))).rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza 400 si cantidad no es entero (decimal)', async () => {
      const mocks = makeMocks();

      await expect(buildUseCase(mocks).execute(buildInputBase({
        items: [{ producto_id: 'prod-001', cantidad: 1.5, precio_unitario: 100 }],
      }))).rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza 400 si precio_unitario es negativo', async () => {
      const mocks = makeMocks();

      await expect(buildUseCase(mocks).execute(buildInputBase({
        items: [{ producto_id: 'prod-001', cantidad: 1, precio_unitario: -50 }],
      }))).rejects.toMatchObject({ statusCode: 400 });
    });

    it('precio_unitario=0 es válido (producto gratis)', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 10 }));
      mocks.catalogoRepo.findById.mockResolvedValue(buildProductoCatalogo());
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada({
        precio_unitario: 0,
        precio_total: 0,
        neto_vendedor: 0,
        comision_monto: 0,
      }));

      await expect(buildUseCase(mocks).execute(buildInputBase({
        items: [{ producto_id: 'prod-001', cantidad: 1, precio_unitario: 0 }],
      }))).resolves.toBeDefined();

      const argCreado = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(argCreado.precio_total).toBeCloseTo(0);
      expect(argCreado.neto_vendedor).toBeCloseTo(0);
      expect(argCreado.comision_monto).toBeCloseTo(0);
    });

    it('lanza 404 si el vendedor no existe', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(null);

      await expect(buildUseCase(mocks).execute(buildInputBase()))
        .rejects.toMatchObject({ message: 'Vendedor no encontrado', statusCode: 404 });
    });

    it('no llama ventaProductoRepo.create si falla la validación de cantidad', async () => {
      const mocks = makeMocks();

      await expect(buildUseCase(mocks).execute(buildInputBase({
        items: [{ producto_id: 'prod-001', cantidad: 0, precio_unitario: 100 }],
      }))).rejects.toMatchObject({ statusCode: 400 });

      expect(mocks.ventaProductoRepo.create).not.toHaveBeenCalled();
      expect(mocks.usuarioRepo.findById).not.toHaveBeenCalled();
    });

  });

  // ── RETORNO ───────────────────────────────────────────────────────────────

  describe('retorno del use case', () => {

    it('retorna array con todas las VentaProducto creadas', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 10 }));
      mocks.catalogoRepo.findById.mockResolvedValue(buildProductoCatalogo());

      const venta1 = buildVentaCreada({ id: 'v1' });
      const venta2 = buildVentaCreada({ id: 'v2' });
      mocks.ventaProductoRepo.create
        .mockResolvedValueOnce(venta1)
        .mockResolvedValueOnce(venta2);

      const resultado = await buildUseCase(mocks).execute(buildInputBase({
        items: [
          { producto_id: 'prod-001', cantidad: 1, precio_unitario: 100 },
          { producto_id: 'prod-002', cantidad: 2, precio_unitario: 50 },
        ],
      }));

      expect(resultado).toHaveLength(2);
      expect(resultado[0].id).toBe('v1');
      expect(resultado[1].id).toBe('v2');
    });

    it('turno_id siempre es null en una venta directa', async () => {
      const mocks = makeMocks();
      mocks.usuarioRepo.findById.mockResolvedValue(buildVendedor({ comision_producto: 10 }));
      mocks.catalogoRepo.findById.mockResolvedValue(buildProductoCatalogo());
      mocks.ventaProductoRepo.create.mockResolvedValue(buildVentaCreada());

      await buildUseCase(mocks).execute(buildInputBase());

      const argCreado = mocks.ventaProductoRepo.create.mock.calls[0][0];
      expect(argCreado.turno_id).toBeNull();
    });

  });

});
