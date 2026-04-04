-- Migración: agregar columna tipo a excepciones_dia
-- Las excepciones existentes conservan comportamiento anterior (reemplazo)
ALTER TABLE excepciones_dia
  ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) NOT NULL DEFAULT 'reemplazo';

-- Índice para acelerar filtros por tipo en el cálculo de disponibilidad
CREATE INDEX IF NOT EXISTS idx_excepciones_dia_tipo ON excepciones_dia (profesional_id, fecha, tipo);

-- Reemplazar unique constraint (un único registro por día) por índices parciales
-- que permiten múltiples excepciones adicionales por día con distinta hora_inicio
ALTER TABLE excepciones_dia DROP CONSTRAINT IF EXISTS excepciones_dia_profesional_id_fecha_key;

-- Solo un reemplazo por profesional por día (comportamiento original)
CREATE UNIQUE INDEX IF NOT EXISTS uq_excepciones_reemplazo
  ON excepciones_dia (profesional_id, fecha)
  WHERE tipo = 'reemplazo';

-- Solo un adicional por profesional por día por hora de inicio (evita duplicados)
CREATE UNIQUE INDEX IF NOT EXISTS uq_excepciones_adicional
  ON excepciones_dia (profesional_id, fecha, hora_inicio)
  WHERE tipo = 'adicional';
