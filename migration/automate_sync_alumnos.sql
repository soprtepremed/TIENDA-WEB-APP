-- PASO 1: Asegurar que la función lógica esté actualizada
CREATE OR REPLACE FUNCTION soporte.sincronizar_alumnos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO soporte.correos_autorizados (email, turno, nombre_alumno, activo)
    SELECT 
        email, 
        turno, 
        TRIM(COALESCE(nombre, '') || ' ' || COALESCE(apellido, '')) as nombre_alumno,
        activo
    FROM premed.alumnos
    WHERE activo = true 
      AND (
          (turno = 'vespertino' AND modalidad = 'presencial') 
          OR 
          (turno = 'matutino') 
      )
    ON CONFLICT (email) DO UPDATE 
    SET 
        turno = EXCLUDED.turno,
        nombre_alumno = EXCLUDED.nombre_alumno,
        activo = EXCLUDED.activo;
END;
$$;

-- PASO 2: Activar extensión (por si acaso)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- PASO 3: Limpiar tareas viejas de forma SEGURA (Sin error si no existen)
DELETE FROM cron.job WHERE jobname = 'sincronizacion_alumnos_5h';
DELETE FROM cron.job WHERE jobname = 'sincronizacion_alumnos_12h';

-- PASO 4: Programar tarea nueva (Cada 12 horas)
SELECT cron.schedule(
    'sincronizacion_alumnos_12h',  -- Nombre
    '0 */12 * * *',                 -- Frecuencia
    'SELECT soporte.sincronizar_alumnos()'
);

-- Verificación final
SELECT * FROM cron.job;
