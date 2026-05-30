-- Migración 009: email de cliente opcional
-- Fecha: 2026-05-30
--
-- Problema: el flujo de reserva desde la landing pública dejó de pedir el email
-- (no se usa para nada; la comunicación es por WhatsApp/teléfono). Pero la columna
-- clientes.email era NOT NULL, así que era imposible crear un cliente sin email.
--
-- Solución: permitir NULL en clientes.email. El email pasa a ser opcional tanto
-- en el flujo público como en el panel admin.
--
-- Nota sobre los UNIQUE existentes (clientes_email_empresa_id_key y
-- clientes_email_empresa_id_unique, ambos sobre (email, empresa_id)): no hay que
-- tocarlos. PostgreSQL trata cada NULL como distinto, por lo que se permiten
-- múltiples clientes sin email dentro de la misma empresa, y se sigue impidiendo
-- duplicar un email real.

ALTER TABLE clientes
  ALTER COLUMN email DROP NOT NULL;
