# Fix: ventas invisibles en el tab Ventas de Productos (`fecha_venta` NULL)

**Rama:** `fix/ventas-fecha-venta` (desde develop)

## Objetivo

El tab Ventas de la sección Productos no muestra las ventas nuevas: los dos caminos de creación (`CreateVentaDirectaUseCase` y `FinalizarTurnoUseCase`) guardan `venta_productos.fecha_venta = NULL`, y todas las consultas del tab filtran con `fecha_venta BETWEEN desde AND hasta` — una fila con NULL no aparece nunca. Solo se ven las ventas backfilleadas por la migración 007 (mayo 2026) y las cargadas como "fecha pasada".

## Alcance

**Entra:**
- **A — Fix de lectura**: en `PostgresVentaProductoRepository`, filtrar por
  `COALESCE(vp.fecha_venta, trn.fecha, DATE(vp.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires'))`
  (misma semántica que `FECHA_VENTA_SQL` de Finanzas/Métricas/Gastos, con `vp.fecha_venta` primero).
  Afecta: `findAllPaginated` (data + count), `getResumen` (3 queries), `findByVendedor`. Agregar `LEFT JOIN turnos trn` donde falte.
- **B — Fix de escritura**: setear `fecha_venta` al crear ventas:
  - `FinalizarTurnoUseCase`: fecha del turno.
  - `CreateVentaDirectaUseCase`: fecha actual en zona `America/Argentina/Buenos_Aires` cuando el item no la trae (ojo: Railway corre en UTC, un `new Date()` ingenuo pone la fecha de mañana después de las 21:00 AR).
- Ajuste de tests existentes de esos use cases + tests nuevos del comportamiento.

**Queda explícitamente afuera:**
- Backfill de `fecha_venta IS NULL` en prod (innecesario para el tab con el fix A; si se quiere por higiene, pasa por la skill `migracion-prod` como decisión aparte).
- Unificar `FECHA_VENTA_SQL` para que Finanzas/Métricas/Gastos respeten `fecha_venta` retroactiva (movería números históricos entre meses — decisión aparte).
- Cambios de frontend y de esquema (no hay migración).

## Plan por fases

1. **Fix A (lectura)** — `PostgresVentaProductoRepository`: constante local o reutilización de la fecha efectiva con `vp.fecha_venta` primero; 6 queries actualizadas. Hecho cuando: una venta con `fecha_venta NULL` aparece en registro y resumen filtrando por su fecha de creación.
2. **Fix B (escritura)** — `FinalizarTurnoUseCase` pasa `fecha_venta: turno.fecha`; `CreateVentaDirectaUseCase` default a hoy en zona AR. Hecho cuando: toda venta nueva queda con `fecha_venta` no nulo y correcto.
3. **Tests** — actualizar los existentes que rompan y cubrir: venta directa sin fecha → hoy AR; venta de turno → fecha del turno; queries incluyen filas con `fecha_venta` NULL. Hecho cuando: suite backend verde.
4. **Verificación local** — build (`npm ci --omit=dev && npm run build`, luego `npm install`) + prueba manual contra DB local con filas NULL. Hecho cuando: build Railway-like verde y tab Ventas muestra las ventas en local.

## Bitácora

### 2026-09-03
- Diagnóstico completo: `fecha_venta` NULL en ambos caminos de creación; el tab Ventas filtra por la columna a secas mientras Finanzas/Métricas/Gastos usan `FECHA_VENTA_SQL` (COALESCE turno/created_at) y por eso no se ven afectados.
- Decisión: aplicar A + B juntos; backfill en prod y unificación de `FECHA_VENTA_SQL` quedan fuera de alcance.
- Rama `fix/ventas-fecha-venta` creada desde develop.
- **Fase 1 (fix A) hecha**: constante local `FECHA_VENTA_EFECTIVA` en `PostgresVentaProductoRepository` (local y no compartida a propósito: el archivo `sql.constants.ts` solo existe en la rama frenada `feature/gastos-superadmin`; crearlo acá generaría conflicto add/add en el merge futuro). 6 queries actualizadas + `LEFT JOIN turnos trn`; el registro además pisa `fecha_venta` en el SELECT para mostrar la fecha efectiva.
- **Fase 2 (fix B) hecha**: `FinalizarTurnoUseCase` graba `fecha_venta = DateUtils.normalizeDate(turno.fecha)`; `CreateVentaDirectaUseCase` defaultea a `DateUtils.nowAR().fecha` (hoy en zona AR, seguro en server UTC).
- **Fase 3 hecha**: test viejo que asertaba el NULL actualizado + test nuevo en FinalizarTurno. Suite: 338/338 verde, `tsc --noEmit` limpio.
- **Pendiente (fase 4)**: build Railway-like (`npm ci --omit=dev && npm run build`) y prueba manual con DB local (Docker estaba apagado en esta sesión). Ambos quedan para el cierre con `cerrar-feature`.
