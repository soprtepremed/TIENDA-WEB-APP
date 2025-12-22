-- 1. Eliminar la restricción actual que fuerza a que el EMAIL sea único en toda la tabla
ALTER TABLE soporte.correos_autorizados 
DROP CONSTRAINT IF EXISTS correos_autorizados_email_key;

-- 2. Crear una nueva restricción ÚNICA combinada (Email + Turno)
-- Esto permite que el mismo correo exista 2 veces, siempre y cuando el turno sea diferente.
ALTER TABLE soporte.correos_autorizados 
ADD CONSTRAINT correos_autorizados_email_turno_key 
UNIQUE (email, turno);
