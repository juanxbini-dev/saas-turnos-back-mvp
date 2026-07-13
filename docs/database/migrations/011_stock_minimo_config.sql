-- Migración 011: umbral de bajo stock configurable por empresa
-- Fecha: 2026-07-13
-- Pendiente de aplicar en producción (junto con la 010, requiere confirmación)

ALTER TABLE public.configuracion_productos
    ADD COLUMN IF NOT EXISTS stock_minimo INTEGER NOT NULL DEFAULT 3;
