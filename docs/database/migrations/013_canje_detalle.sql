-- Migración 013: detalle del canje (texto libre) en turnos y venta_productos
-- Fecha: 2026-07-31
-- Aplicada en producción: 2026-07-31
--
-- Guarda por qué se canjeó / qué se recibió a cambio cuando metodo_pago = 'canje'.
-- Es NULL para cualquier otro método (el backend lo resetea si un canje se edita
-- a otro método de pago). El backend normaliza: trim y truncado a 500 caracteres.

ALTER TABLE public.turnos
    ADD COLUMN IF NOT EXISTS canje_detalle TEXT NULL;

ALTER TABLE public.venta_productos
    ADD COLUMN IF NOT EXISTS canje_detalle TEXT NULL;
