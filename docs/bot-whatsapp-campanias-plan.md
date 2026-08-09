# Plan de implementación — Campañas WhatsApp

> **Diseño de referencia:** `bot-whatsapp-campanias.md` (las secciones §N citadas son de ese doc).
> **Cómo usar este archivo:** marcar `[x]` a medida que se completa, actualizar la tabla de estado general, y registrar cada sesión de trabajo en la **Bitácora** del final. Este archivo es la fuente de verdad del progreso.

---

## Estado general

| Fase | Contenido | Estado |
|---|---|---|
| Preparación | Rama, entorno local, decisiones del cliente | ⬜ Pendiente |
| Fase 0 | Infraestructura: migraciones, motor, config, opt-in/out | ⬜ Pendiente |
| Fase 1 | Campañas de turnos + import Excel | ⬜ Pendiente |
| Medición | Panel de métricas (niveles 1 y 2) | ⬜ Pendiente |
| Fase 2 | Campañas de productos | ⬜ Pendiente |
| n8n / Meta | Workflow, plantillas, opt-out | ⬜ Pendiente |
| Rollout | Dark launch → shadow → whitelist → live | ⬜ Pendiente |

Estados: ⬜ Pendiente · 🟡 En curso · ✅ Completa

**Definición de "hecho" (aplica a todo paso con código):** compila (`npm run build`), tests del paso pasan, probado en local contra el dump, y commiteado en la rama con mensaje en español.

---

## Paso 0 — Preparación (antes de escribir código)

### 0.A Entorno de trabajo
- [ ] Crear rama `feature/campanias` desde `develop`
- [ ] Restaurar dump de prod en Postgres local (pedir dump fresco si `prod_clean.sql` quedó viejo)
- [ ] Configurar `.env` local: `N8N_WEBHOOK_BASE_URL` vacía o apuntando a la instancia de **pruebas** (NUNCA la productiva — el dump tiene teléfonos reales)
- [ ] Verificar que el backend levanta y el cron de recordatorios existente no dispara nada raro en local

### 0.B Decisiones del cliente (bloquean pasos posteriores, pedir ya)
- [ ] Umbral win-back: ¿a cuántos días un cliente es "perdido"? (default propuesto: 60)
- [ ] ¿Win-back con beneficio/descuento? ¿Cuál?
- [ ] Criterio para la base existente: default true + baja fácil / aviso en primer mensaje / re-confirmación (§2.5)
- [ ] Pedir el **Excel de clientes** del sistema anterior
- [ ] Borradores de **textos de plantillas** (6 campañas) — mandar a aprobar a Meta apenas estén (es el lead time externo más largo)

---

## Fase 0 — Infraestructura común

> Todo nace con `CAMPANIAS_ENABLED=false` por defecto (§9.2). El orden de los pasos respeta dependencias.

### F0-1. Migración SQL (tarea 0.1, esquema en §2.1)
- [ ] Script de migración: `campanias_config`, `mensajes_automatizados` (con estado `'simulado'`), columnas en `clientes` (opt-in/out + `ultima_visita_importada`), `servicios.frecuencia_dias`, `productos.tags` + `duracion_estimada_dias`
- [ ] Correr y verificar en local
- [ ] ⚠️ En prod recién en el paso R-1 (rollout), con confirmación explícita

### F0-2. Dominio y repositorios (tarea 0.2)
- [ ] Entidades: `CampaniaConfig`, `MensajeAutomatizado` (+ tipos de campaña)
- [ ] Interfaces + implementaciones Postgres de ambos repos
- [ ] Métodos de dedupe/cooldown en el repo de mensajes (por cliente+tipo+fecha, por referencia_id)

### F0-3. Config y flags (parte de 0.4)
- [ ] `CAMPANIAS_ENABLED`, `CAMPANIAS_MODE`, `CAMPANIAS_TELEFONOS_PRUEBA`, `N8N_WEBHOOK_TOKEN` en `config/env.ts`
- [ ] Mover `N8N_WEBHOOK_BASE_URL` a `config/env.ts`
- [ ] Actualizar `.env.example`

### F0-4. N8nService (tarea 0.4)
- [ ] Método `enviarCampania()` con payload genérico (§2.3): tipo + empresa + cliente + contexto
- [ ] Header `X-Webhook-Token` en el método nuevo y en los 3 webhooks existentes

### F0-5. Motor de campañas (tarea 0.3 — el corazón, §2.2 y §9.2)
- [ ] Cron `campanias.cron.ts` registrado solo si `CAMPANIAS_ENABLED` (horario 10:00 AR)
- [ ] Orquestador: lee `campanias_config` habilitadas → corre selector por tipo → filtros globales (activo, `acepta_marketing`, teléfono, sin turno futuro si aplica, cap 1/día, cooldown, dedupe)
- [ ] Modos: `shadow` (registra `'simulado'`, no envía) / `whitelist` (solo teléfonos de prueba) / `live`
- [ ] Registro en `mensajes_automatizados` (enviado/fallido/simulado) — idempotente ante caídas
- [ ] Manejo de errores + logging Winston (patrón del cron existente)
- [ ] Tests unitarios del motor: filtros, dedupe, cooldown, modos (tarea 0.9)

### F0-6. API de configuración (tarea 0.6)
- [ ] Use cases CRUD de `campanias_config` + validación de `parametros` por tipo
- [ ] Controller + rutas `/api/campanias/*` (auth admin)
- [ ] Endpoint dry-run (tarea 0.8): candidatos del día por campaña sin enviar

### F0-7. Opt-in / opt-out (tareas 0.5 y 0.10)
- [ ] Endpoint `POST /api/webhooks/n8n/opt-out` (auth por token) → `acepta_marketing=false` + timestamp
- [ ] Frontend: checkbox de consentimiento en reserva pública + alta/edición de cliente, persistiendo `marketing_opt_in_at`/`opt_in_metodo`

### F0-8. Frontend: pantalla Campañas (tarea 0.7)
- [ ] Página nueva con toggle por campaña + formulario de parámetros por tipo
- [ ] Ruta + navegación (solo admin)

**Checkpoint Fase 0:** ✅ cuando el motor corre en local en modo shadow contra el dump y el dry-run devuelve candidatos coherentes.

---

## Fase 1 — Campañas de turnos

### F1-1. Post-servicio (tarea 1.1) — la primera porque es la más simple
- [ ] Selector sobre `finalizado_at` + delay, dedupe por `turno_id` + tests
- [ ] Verificar candidatos con dry-run contra el dump

### F1-2. Última visita y frecuencia (tarea 1.2 — base de recencia y win-back)
- [ ] Query compartida: última visita real (turnos completados) con fallback `ultima_visita_importada`
- [ ] Servicio habitual + frecuencia esperada (columna del servicio o mediana propia, mín. 3 visitas) + tests

### F1-3. Recencia (tarea 1.3)
- [ ] Selector ventana `frecuencia..frecuencia+ventana`, exclusiones, dedupe por ciclo + tests

### F1-4. Win-back (tarea 1.4)
- [ ] Selector umbral + escalera de `max_intentos`, exclusión mutua con recencia + tests

### F1-5. Turno abandonado (tarea 1.5)
- [ ] Variante (a) pendiente > X horas + variante (b) cancelado sin reagendar, con `link_reserva` + tests

### F1-6. Frontend servicios (tarea 1.6)
- [ ] Campo `frecuencia_dias` en ABM de servicios

### F1-7. Import Excel (tarea 1.8, diseño §3.7)
- [ ] Recibido el Excel real del cliente
- [ ] Script: staging `import_clientes_legacy` + normalización de teléfonos (idéntica a `normalizarTelefono`, incluye "15")
- [ ] Reporte dry-run: existentes / nuevos / descartados → **aprobación del cliente**
- [ ] Insert con marcas (`opt_in_metodo='importado_sistema_anterior'`, `ultima_visita_importada`)
- [ ] Cap de goteo para la cohorte en el motor (20–50/día)

**Checkpoint Fase 1:** ✅ cuando las 4 campañas + import muestran candidatos correctos en dry-run local.

---

## Medición (en paralelo con Fase 1)

### M-1. Backend métricas (tarea M.1)
- [ ] Endpoint agregados: enviados/fallidos por tipo/mes, opt-outs
### M-2. Frontend métricas (tarea M.2)
- [ ] Pestaña "Métricas" en la pantalla Campañas
### M-3. Conversión (tarea M.3)
- [ ] Query mensaje → turno agendado ≤ N días + visualización

---

## Fase 2 — Campañas de productos

### F2-1. Frontend productos (tarea 2.1)
- [ ] Tags (chips) + `duracion_estimada_dias` en ABM de productos
### F2-2. Seguimiento por tag (tarea 2.2)
- [ ] Selector con delay por tag + tests
### F2-3. Reposición (tarea 2.3)
- [ ] Selector con exclusión por recompra + tests

---

## n8n / Meta (en paralelo desde que haya textos)

- [ ] N.2 Redactar y dar de alta ~6 plantillas Marketing en Meta → **registrar acá el estado de aprobación de cada una**
  - [ ] recencia · [ ] winback · [ ] post_servicio · [ ] seguimiento_producto · [ ] reposicion_producto · [ ] turno_abandonado
- [ ] N.1 Workflow `campania` con switch por tipo (instancia de pruebas primero)
- [ ] N.3 Flujo BAJA/STOP → endpoint opt-out del backend
- [ ] N.4 Validación del token en webhooks (nuevo + 3 existentes)

---

## Rollout (§9.4) — cada paso requiere el anterior verificado

### R-1. Dark launch
- [ ] Build + tests OK en la rama (regla: build antes de merge)
- [ ] Merge `feature/campanias` → `develop` → `main` (estrategia de merge de siempre)
- [ ] ⚠️ Migración en prod — **con confirmación explícita del usuario**
- [ ] Deploy con `CAMPANIAS_ENABLED=false` → verificar que prod sigue idéntico (health, recordatorios del día siguiente)

### R-2. Shadow en prod
- [ ] `CAMPANIAS_ENABLED=true` + `CAMPANIAS_MODE=shadow` en Railway
- [ ] Revisar `'simulado'` durante 3–5 días, comparar contra la realidad, ajustar umbrales
- [ ] Cliente valida la lista de "a quién le habríamos escrito"

### R-3. Whitelist
- [ ] `CAMPANIAS_MODE=whitelist` con tu teléfono + el del dueño
- [ ] Recibir cada tipo de mensaje real (plantillas aprobadas vía n8n)
- [ ] Probar el circuito BAJA de punta a punta

### R-4. Live gradual
- [ ] `CAMPANIAS_MODE=live` — habilitar **solo post-servicio** con caps conservadores
- [ ] Una semana mirando bajas + quality rating en WhatsApp Manager
- [ ] Habilitar recencia → win-back (goteo para importados) → abandonado → productos, con días de observación entre cada una
- [ ] Cargar datos del cliente: frecuencias de servicios, tags y duraciones de productos

**Checkpoint final:** ✅ todas las campañas activas, métricas mostrando datos, quality rating verde.

---

## Bitácora de progreso

> Registrar cada sesión de trabajo: qué se completó, decisiones tomadas, bloqueos. Las decisiones importantes también van al doc de diseño.

| Fecha | Pasos trabajados | Notas / decisiones / bloqueos |
|---|---|---|
| 2026-07-12 | — | Plan creado. Diseño completo en `bot-whatsapp-campanias.md`. Presupuesto presentado al cliente ($700.000, ver `mensaje.pdf`). A la espera de confirmación del cliente. |
