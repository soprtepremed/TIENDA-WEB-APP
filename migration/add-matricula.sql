-- Agregar campo id_alumno a la tabla asistencias
ALTER TABLE asistencias ADD COLUMN IF NOT EXISTS id_alumno TEXT;

-- Crear índice para búsquedas por id_alumno
CREATE INDEX IF NOT EXISTS idx_asistencias_id_alumno ON asistencias(id_alumno);
