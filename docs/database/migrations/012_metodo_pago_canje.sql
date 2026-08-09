-- Migración 012: permitir metodo_pago 'canje' en turnos
-- Fecha: 2026-07-31
-- Aplicada en producción: 2026-07-31
--
-- El CHECK turnos_metodo_pago_check solo permite efectivo/transferencia/pendiente;
-- sin esta migración, finalizar o cobrar un turno con canje falla por constraint.
-- No se agrega 'tarjeta' porque el servicio de un turno nunca se cobra con tarjeta
-- (tarjeta es solo para productos, en venta_productos, que no tiene CHECK).

ALTER TABLE public.turnos
    DROP CONSTRAINT IF EXISTS turnos_metodo_pago_check;

ALTER TABLE public.turnos
    ADD CONSTRAINT turnos_metodo_pago_check
    CHECK (metodo_pago IN ('efectivo', 'transferencia', 'pendiente', 'canje'));
