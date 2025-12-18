-- Sincronizar alumnos desde PREMED.ALUMNOS a SOPORTE.CORREOS_AUTORIZADOS
-- Objetivo: Copiar correos nuevos de la tabla central a la tabla operativa actual.

INSERT INTO soporte.correos_autorizados (email, turno, nombre_alumno, activo)
SELECT 
    email, 
    turno, 
    TRIM(COALESCE(nombre, '') || ' ' || COALESCE(apellido, '')) as nombre_alumno, -- Nombre completo
    activo
FROM premed.alumnos
WHERE activo = true
ON CONFLICT (email) DO UPDATE 
SET 
    turno = EXCLUDED.turno,
    nombre_alumno = EXCLUDED.nombre_alumno,
    activo = EXCLUDED.activo;

-- Confirmación visual de cuántos quedaron
SELECT count(*) as total_alumnos_activos FROM soporte.correos_autorizados WHERE activo = true;
