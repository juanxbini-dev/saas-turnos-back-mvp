-- Migración 002: Crear tabla marcas y agregar marca_id a productos
-- Fecha: 2026-03-28

-- 1. Crear tabla marcas
CREATE TABLE IF NOT EXISTS public.marcas (
    id          VARCHAR(255) NOT NULL,
    empresa_id  VARCHAR(255) NOT NULL,
    nombre      VARCHAR(100) NOT NULL,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT marcas_pkey PRIMARY KEY (id),
    CONSTRAINT marcas_empresa_fk FOREIGN KEY (empresa_id)
        REFERENCES public.empresas(id) ON DELETE CASCADE,
    CONSTRAINT marcas_nombre_empresa_unique UNIQUE (empresa_id, nombre)
);

-- 2. Agregar columna marca_id a productos (nullable para no romper registros existentes)
ALTER TABLE public.productos
    ADD COLUMN IF NOT EXISTS marca_id VARCHAR(255) NULL,
    ADD CONSTRAINT productos_marca_fk FOREIGN KEY (marca_id)
        REFERENCES public.marcas(id) ON DELETE SET NULL;

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_marcas_empresa_id ON public.marcas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_productos_marca_id ON public.productos(marca_id);
