-- Migration 007: venta_productos mejoras (fecha_venta, venta al costo)
-- Aplicada en producción: 2026-05-08

ALTER TABLE venta_productos
  ADD COLUMN IF NOT EXISTS fecha_venta             DATE,
  ADD COLUMN IF NOT EXISTS es_venta_costo          BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS costo_unitario_snapshot NUMERIC(10,2);

-- Backfill fecha_venta
UPDATE venta_productos
SET fecha_venta = DATE(created_at AT TIME ZONE 'America/Argentina/Buenos_Aires');

UPDATE venta_productos vp
SET fecha_venta = t.fecha
FROM turnos t
WHERE t.id = vp.turno_id
  AND vp.turno_id IS NOT NULL;
