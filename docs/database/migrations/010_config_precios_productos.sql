-- Migración 010: Configuración de porcentajes de ganancia por método de pago + precio tarjeta
-- Fecha: 2026-07-12
-- Pendiente de aplicar en producción (requiere confirmación explícita)

-- 1. Tabla de configuración de precios de productos (una fila por empresa)
--    Porcentaje de ganancia sobre el costo por método de pago.
CREATE TABLE IF NOT EXISTS public.configuracion_productos (
    empresa_id         VARCHAR(255) NOT NULL,
    pct_efectivo       NUMERIC(6,2) NOT NULL DEFAULT 0,
    pct_transferencia  NUMERIC(6,2) NOT NULL DEFAULT 0,
    pct_tarjeta        NUMERIC(6,2) NOT NULL DEFAULT 0,
    created_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at         TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT configuracion_productos_pkey PRIMARY KEY (empresa_id),
    CONSTRAINT configuracion_productos_empresa_fk FOREIGN KEY (empresa_id)
        REFERENCES public.empresas(id) ON DELETE CASCADE
);

-- 2. Precio tarjeta en productos (nullable: NULL = derivado de la configuración)
ALTER TABLE public.productos
    ADD COLUMN IF NOT EXISTS precio_tarjeta NUMERIC(10,2) NULL;

-- 3. Los precios pasan a ser opcionales: NULL = se calcula desde costo × (1 + pct/100).
--    Un valor cargado = override manual del producto.
ALTER TABLE public.productos ALTER COLUMN precio_efectivo DROP NOT NULL;
ALTER TABLE public.productos ALTER COLUMN precio_transferencia DROP NOT NULL;

-- 4. NOTA metodo_pago: se agrega 'tarjeta' como valor posible en venta_productos.metodo_pago.
--    En el repo no existe ningún CHECK sobre esa columna, pero como la tabla se creó
--    directo en producción, verificar antes de aplicar:
--      SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--      WHERE conrelid = 'venta_productos'::regclass AND contype = 'c';
--    Si existiera un CHECK sobre metodo_pago, ampliarlo para incluir 'tarjeta'.

-- 5. NOTA costo: pasa a ser obligatorio a nivel de aplicación (no se agrega NOT NULL
--    en DB para no romper filas legacy con costo NULL).
