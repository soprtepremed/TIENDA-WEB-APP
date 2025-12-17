-- =====================================================================
-- Habilitar permisos de escritura en tabla Evaluaciones
-- Soluciona el error: "new row violates row-level security policy"
-- =====================================================================

-- 1. Asegurarnos de que RLS esté activado (buena práctica)
ALTER TABLE soporte.evaluaciones ENABLE ROW LEVEL SECURITY;

-- 2. Crear política para permitir TODO (Select, Insert, Update, Delete)
-- NOTA: En producción idealmente restringimos esto, pero para este sistema interno
-- y la anon_key proporcionada, necesitamos acceso completo.

-- Eliminar políticas previas si existen para evitar conflictos
DROP POLICY IF EXISTS "Permiso total evaluaciones" ON soporte.evaluaciones;

-- Crear nueva política permisiva
CREATE POLICY "Permiso total evaluaciones"
ON soporte.evaluaciones
FOR ALL
USING (true)
WITH CHECK (true);

-- Información:
-- Esto permite que cualquier cliente con la ANON_KEY pueda leer y escribir.
-- Si en el futuro implementas autenticación estricta, cambia "active" por roles específicos.
