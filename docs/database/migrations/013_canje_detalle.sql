-- Migración 013: detalle del canje (texto libre) en turnos y venta_productos
-- Fecha: 2026-07-31
-- Pendiente de aplicar en producción (junto con la 010, 011 y 012, requiere confirmación)
--
-- Guarda por qué se canjeó / qué se recibió a cambio cuando metodo_pago = 'canje'.
-- Es NULL para cualquier otro método (el backend lo resetea si un canje se edita
-- a otro método de pago). El backend normaliza: trim y truncado a 500 caracteres.

ALTER TABLE public.turnos
    ADD COLUMN IF NOT EXISTS canje_detalle TEXT NULL;

ALTER TABLE public.venta_productos
    ADD COLUMN IF NOT EXISTS canje_detalle TEXT NULL;
