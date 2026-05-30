-- Migración 008: permitir horarios cortados en disponibilidad_semanal
-- Fecha: 2026-05-29
--
-- Problema: el unique constraint sobre profesional_id limitaba a UN solo
-- registro de disponibilidad por profesional, impidiendo cargar horarios
-- cortados (ej. Lun-Vie 09:00-13:00 y Lun-Vie 17:00-20:00).
--
-- Solución: quitar el unique sobre profesional_id y reemplazarlo por uno
-- compuesto que evita duplicados exactos pero permite múltiples rangos.

ALTER TABLE disponibilidad_semanal
  DROP CONSTRAINT IF EXISTS disponibilidad_semanal_profesional_id_key;

-- Evita filas idénticas (mismo profesional, mismos días, misma hora de inicio)
-- sin bloquear rangos distintos del mismo profesional.
CREATE UNIQUE INDEX IF NOT EXISTS uq_disponibilidad_rango
  ON disponibilidad_semanal (profesional_id, dia_inicio, dia_fin, hora_inicio);

-- El CHECK previo solo permitía intervalos de 15/30/60 min, pero el modal ahora
-- ofrece 1h (60) y 2h (120). Se agrega 120 conservando los valores legacy para
-- no invalidar filas existentes.
ALTER TABLE disponibilidad_semanal
  DROP CONSTRAINT IF EXISTS disponibilidad_semanal_intervalo_minutos_check;

ALTER TABLE disponibilidad_semanal
  ADD CONSTRAINT disponibilidad_semanal_intervalo_minutos_check
  CHECK (intervalo_minutos = ANY (ARRAY[15, 30, 60, 120]));
