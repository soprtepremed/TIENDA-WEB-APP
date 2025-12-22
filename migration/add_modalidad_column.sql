-- Agrega la columna 'modalidad' a la tabla correos_autorizados
-- Por defecto, los registros existentes serán 'Presencial'

ALTER TABLE soporte.correos_autorizados
ADD COLUMN modalidad text DEFAULT 'Presencial';

-- CONSEJO:
-- Si tu intención es tener al mismo alumno (mismo email) en dos modalidades distintas
-- (ej. una fila para Presencial y otra fila para En Línea),
-- necesitarás también cambiar la regla de unicidad para que sea por (email + modalidad).
-- Si ese es el caso, ejecuta también lo siguiente:

-- 1. Quitar la regla de "email único"
-- ALTER TABLE soporte.correos_autorizados DROP CONSTRAINT IF EXISTS correos_autorizados_email_key;

-- 2. Crear nueva regla "email + modalidad únicos"
-- ALTER TABLE soporte.correos_autorizados ADD CONSTRAINT correos_autorizados_email_modalidad_key UNIQUE (email, modalidad);
