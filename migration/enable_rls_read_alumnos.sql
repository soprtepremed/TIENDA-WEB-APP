-- Habilitar lectura pública (anon) para la tabla de alumnos
-- Requerido para que la aplicación web pueda consultar si un alumno está activo/inscrito.

-- 1. Asegurar que RLS esté activo (por seguridad)
ALTER TABLE premed.alumnos ENABLE ROW LEVEL SECURITY;

-- 2. Crear la política permitir lectura solo de alumnos activos
-- Nota: Si ya existe una política similar, esto podría dar error, pero es seguro intentarlo.
CREATE POLICY "Lectura publica alumnos activos" 
ON premed.alumnos 
FOR SELECT 
TO anon 
USING (activo = true);
