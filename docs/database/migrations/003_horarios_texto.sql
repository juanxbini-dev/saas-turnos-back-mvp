-- Migración 003: Reemplazar horarios JSONB por horarios_texto TEXT
-- Fecha: 2026-03-28

ALTER TABLE public.landing_config
    DROP COLUMN IF EXISTS horarios,
    ADD COLUMN IF NOT EXISTS horarios_texto TEXT NULL;
