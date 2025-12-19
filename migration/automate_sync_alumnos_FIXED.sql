-- ============================================
-- SINCRONIZACIÓN AUTOMÁTICA DE ALUMNOS (CORREGIDO)
-- Incluye: Matutino (todos) + Vespertino (TODAS las modalidades)
-- ============================================

-- PASO 1: Actualizar la función de sincronización
CREATE OR REPLACE FUNCTION soporte.sincronizar_alumnos()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Primero desactivar todos los existentes
    UPDATE soporte.correos_autorizados SET activo = false;
    
    -- Insertar/actualizar alumnos activos
    INSERT INTO soporte.correos_autorizados (email, turno, nombre_alumno, activo)
    SELECT 
        LOWER(email) as email,
        turno, 
        TRIM(COALESCE(nombre, '') || ' ' || COALESCE(apellido, '')) as nombre_alumno,
        true as activo
    FROM premed.alumnos
    WHERE activo = true 
      AND status = 'activo'
      AND email IS NOT NULL
      AND email != ''
      AND (
          turno = 'matutino'        -- Todos los matutinos
          OR 
          turno = 'vespertino'      -- Todos los vespertinos (presencial Y en línea)
      )
    ON CONFLICT (email) DO UPDATE 
    SET 
        turno = EXCLUDED.turno,
        nombre_alumno = EXCLUDED.nombre_alumno,
        activo = EXCLUDED.activo;
END;
$$;

-- PASO 2: Activar extensión pg_cron (por si acaso)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- PASO 3: Limpiar tareas programadas anteriores
DELETE FROM cron.job WHERE jobname IN ('sincronizacion_alumnos_5h', 'sincronizacion_alumnos_12h');

-- PASO 4: Programar nueva tarea (Cada 12 horas)
SELECT cron.schedule(
    'sincronizacion_alumnos_12h',  -- Nombre de la tarea
    '0 */12 * * *',                -- Cada 12 horas
    'SELECT soporte.sincronizar_alumnos()'
);

-- PASO 5: Ejecutar ahora (sincronización inmediata)
SELECT soporte.sincronizar_alumnos();

-- PASO 6: Verificar resultados
SELECT 
    turno,
    activo,
    COUNT(*) as total
FROM soporte.correos_autorizados
GROUP BY turno, activo
ORDER BY turno DESC, activo DESC;

-- PASO 7: Verificar tareas programadas
SELECT jobid, jobname, schedule, command FROM cron.job WHERE jobname LIKE '%alumnos%';
