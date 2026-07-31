import { Pool } from 'pg';
import { PostgresFinanzasRepository } from '../../infrastructure/repositories/PostgresFinanzasRepository';
import { FinanzasFilters } from '../../domain/entities/Finanzas';

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildFilters(overrides: Partial<FinanzasFilters> = {}): FinanzasFilters {
  return {
    fecha_desde: '2026-07-01',
    fecha_hasta: '2026-07-31',
    tipo: 'todos',
    metodo_pago: 'todos',
    estado_comision: 'todos',
    ordenar_por: 'fecha',
    orden: 'desc',
    pagina: 1,
    por_pagina: 20,
    ...overrides,
  };
}

// La query principal selecciona "SELECT entry"; la de conteo no
const esQueryPrincipal = (sql: string) => /SELECT entry/.test(sql);

function buildPoolMock() {
  const query = jest.fn().mockImplementation((sql: string) => {
    if (esQueryPrincipal(sql)) return Promise.resolve({ rows: [] });
    return Promise.resolve({ rows: [{ total: '0' }] });
  });
  return { pool: { query } as unknown as Pool, query };
}

// Placeholders $n presentes en el SQL, sin duplicados, ordenados
function placeholders(sql: string): number[] {
  const found = new Set((sql.match(/\$(\d+)/g) || []).map(s => parseInt(s.slice(1))));
  return Array.from(found).sort((a, b) => a - b);
}

// Verifica que los placeholders sean exactamente 1..params.length (sin huecos ni sobrantes)
function expectPlaceholdersCoherentes(sql: string, params: any[]) {
  const esperados = Array.from({ length: params.length }, (_, i) => i + 1);
  expect(placeholders(sql)).toEqual(esperados);
}

async function runGetEntradas(filters: FinanzasFilters) {
  const { pool, query } = buildPoolMock();
  const repo = new PostgresFinanzasRepository(pool);
  await repo.getEntradasPaginadas('prof-1', 'emp-1', filters);

  expect(query).toHaveBeenCalledTimes(2);
  const mainCall = query.mock.calls.find(([sql]) => esQueryPrincipal(sql))!;
  const countCall = query.mock.calls.find(([sql]) => !esQueryPrincipal(sql))!;
  return {
    mainSql: mainCall[0] as string,
    mainParams: mainCall[1] as any[],
    countSql: countCall[0] as string,
    countParams: countCall[1] as any[],
  };
}

// ── Matriz completa de filtros: coherencia SQL ↔ parámetros ─────────────────

const TIPOS: FinanzasFilters['tipo'][] = ['todos', 'turnos', 'productos', 'pendientes'];
const METODOS: FinanzasFilters['metodo_pago'][] = ['todos', 'efectivo', 'transferencia', 'pendiente', 'canje'];
const ESTADOS: FinanzasFilters['estado_comision'][] = ['todos', 'pendiente', 'pagada', 'cancelada'];

describe('PostgresFinanzasRepository.getEntradasPaginadas', () => {
  describe('coherencia de placeholders en toda la matriz de filtros', () => {
    const combinaciones: Array<[FinanzasFilters['tipo'], FinanzasFilters['metodo_pago'], FinanzasFilters['estado_comision']]> = [];
    for (const tipo of TIPOS) {
      for (const metodo of METODOS) {
        for (const estado of ESTADOS) {
          combinaciones.push([tipo, metodo, estado]);
        }
      }
    }

    it.each(combinaciones)(
      'tipo=%s metodo_pago=%s estado_comision=%s: placeholders exactos en query principal y de conteo',
      async (tipo, metodo_pago, estado_comision) => {
        const { mainSql, mainParams, countSql, countParams } = await runGetEntradas(
          buildFilters({ tipo, metodo_pago, estado_comision })
        );
        expectPlaceholdersCoherentes(mainSql, mainParams);
        expectPlaceholdersCoherentes(countSql, countParams);
        // El count usa los mismos parámetros que la principal, sin LIMIT/OFFSET
        expect(countParams).toEqual(mainParams.slice(0, -2));
      }
    );
  });

  describe('ramas del UNION según tipo', () => {
    it('tipo=todos incluye ambas ramas en query principal y conteo', async () => {
      const { mainSql, countSql } = await runGetEntradas(buildFilters({ tipo: 'todos' }));
      expect(mainSql).toMatch(/FROM comisiones_turno ct/);
      expect(mainSql).toMatch(/FROM va\b/);
      expect(countSql).toMatch(/FROM comisiones_turno ct/);
      expect(countSql).toMatch(/FROM va\b/);
    });

    it('tipo=turnos excluye la rama de ventas', async () => {
      const { mainSql, countSql } = await runGetEntradas(buildFilters({ tipo: 'turnos' }));
      expect(mainSql).toMatch(/FROM comisiones_turno ct/);
      expect(mainSql).not.toMatch(/FROM va\b/);
      expect(mainSql).not.toMatch(/venta_grupo_id/);
      expect(countSql).not.toMatch(/FROM va\b/);
      expect(mainSql).not.toMatch(/UNION ALL/);
    });

    it('tipo=productos excluye la rama de comisiones de turno', async () => {
      const { mainSql, countSql } = await runGetEntradas(buildFilters({ tipo: 'productos' }));
      expect(mainSql).toMatch(/FROM va\b/);
      expect(mainSql).not.toMatch(/FROM comisiones_turno ct/);
      expect(countSql).toMatch(/FROM va\b/);
      expect(countSql).not.toMatch(/FROM comisiones_turno ct/);
      expect(mainSql).not.toMatch(/UNION ALL/);
    });

    it('tipo=pendientes mantiene ambas ramas', async () => {
      const { mainSql } = await runGetEntradas(buildFilters({ tipo: 'pendientes' }));
      expect(mainSql).toMatch(/FROM comisiones_turno ct/);
      expect(mainSql).toMatch(/FROM va\b/);
      expect(mainSql).toMatch(/UNION ALL/);
    });
  });

  describe('tipo=pendientes: precedencia sobre metodo_pago', () => {
    it('filtra por pendiente en ambas ramas', async () => {
      const { mainSql, countSql } = await runGetEntradas(buildFilters({ tipo: 'pendientes' }));
      expect(mainSql).toMatch(/t\.metodo_pago = 'pendiente'/);
      expect(mainSql).toMatch(/vp\.metodo_pago = 'pendiente'/);
      expect(countSql).toMatch(/t\.metodo_pago = 'pendiente'/);
      expect(countSql).toMatch(/vp\.metodo_pago = 'pendiente'/);
    });

    it('ignora el filtro metodo_pago del usuario (no contradice condiciones)', async () => {
      const { mainSql, mainParams } = await runGetEntradas(
        buildFilters({ tipo: 'pendientes', metodo_pago: 'efectivo' })
      );
      // 'efectivo' no viaja como parámetro ni aparece en el SQL
      expect(mainParams).not.toContain('efectivo');
      expect(mainSql).not.toMatch(/efectivo/);
      expect(mainSql).toMatch(/t\.metodo_pago = 'pendiente'/);
    });
  });

  describe('filtros con parámetros', () => {
    it('metodo_pago viaja como parámetro cuando tipo no es pendientes', async () => {
      const { mainParams } = await runGetEntradas(
        buildFilters({ tipo: 'todos', metodo_pago: 'efectivo' })
      );
      expect(mainParams).toContain('efectivo');
    });

    it('estado_comision no agrega parámetro cuando la rama de turnos no participa', async () => {
      const { mainParams, mainSql } = await runGetEntradas(
        buildFilters({ tipo: 'productos', estado_comision: 'pagada' })
      );
      expect(mainParams).not.toContain('pagada');
      expect(mainSql).not.toMatch(/ct\.estado/);
    });

    it('estado_comision aplica sobre la rama de turnos cuando participa', async () => {
      const { mainParams, mainSql } = await runGetEntradas(
        buildFilters({ tipo: 'turnos', estado_comision: 'pagada' })
      );
      expect(mainParams).toContain('pagada');
      expect(mainSql).toMatch(/ct\.estado = \$\d+/);
    });
  });

  describe('flag tiene_producto_pendiente', () => {
    it('la rama de turnos calcula el flag con EXISTS sobre venta_productos', async () => {
      const { mainSql } = await runGetEntradas(buildFilters({ tipo: 'todos' }));
      expect(mainSql).toMatch(/'tiene_producto_pendiente'/);
      expect(mainSql).toMatch(/EXISTS \(\s*SELECT 1 FROM venta_productos vpp/);
      expect(mainSql).toMatch(/vpp\.turno_id = ct\.turno_id/);
      expect(mainSql).toMatch(/vpp\.empresa_id = ct\.empresa_id/);
      expect(mainSql).toMatch(/vpp\.metodo_pago = 'pendiente'/);
    });
  });

  describe('canje_detalle en el listado', () => {
    it('la rama de turnos expone turnos.canje_detalle y la de ventas lo agrupa con MIN', async () => {
      const { mainSql } = await runGetEntradas(buildFilters({ tipo: 'todos' }));
      expect(mainSql).toMatch(/'canje_detalle',\s+t\.canje_detalle/);
      expect(mainSql).toMatch(/MIN\(vp\.canje_detalle\)\s+AS canje_detalle/);
      expect(mainSql).toMatch(/'canje_detalle',\s+va\.canje_detalle/);
    });
  });

  describe('resultado', () => {
    it('devuelve items del entry y total parseado del conteo', async () => {
      const { pool, query } = buildPoolMock();
      query.mockImplementation((sql: string) => {
        if (esQueryPrincipal(sql)) return Promise.resolve({ rows: [{ entry: { tipo: 'turno', id: 'c1' } }] });
        return Promise.resolve({ rows: [{ total: '7' }] });
      });
      const repo = new PostgresFinanzasRepository(pool);
      const result = await repo.getEntradasPaginadas('prof-1', 'emp-1', buildFilters());
      expect(result.total).toBe(7);
      expect(result.items).toEqual([{ tipo: 'turno', id: 'c1' }]);
    });
  });
});
