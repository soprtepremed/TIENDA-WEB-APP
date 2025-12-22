-- 1. Eliminar la restricción actual que solo permite 'matutino' y 'vespertino'
ALTER TABLE soporte.correos_autorizados 
DROP CONSTRAINT IF EXISTS correos_autorizados_turno_check;

-- 2. Crear la nueva restricción que permite 'En Línea'
ALTER TABLE soporte.correos_autorizados 
ADD CONSTRAINT correos_autorizados_turno_check 
CHECK (turno IN ('matutino', 'vespertino', 'En Línea'));

-- Después de ejecutar esto en el SQL Editor de Supabase,
-- podremos ejecutar el script para duplicar a los alumnos en la nueva lista.
