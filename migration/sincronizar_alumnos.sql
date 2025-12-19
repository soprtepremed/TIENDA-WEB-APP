-- ============================================
-- SCRIPT PARA SINCRONIZAR ALUMNOS
-- Propósito: Sincronizar alumnos activos de premed.alumnos 
-- a soporte.correos_autorizados
-- ============================================

-- PASO 1: Desactivar todos los correos existentes en soporte
UPDATE soporte.correos_autorizados
SET activo = false;

-- PASO 2: Insertar o actualizar alumnos activos desde premed.alumnos
INSERT INTO soporte.correos_autorizados (email, turno, nombre_alumno, activo, created_at)
SELECT 
    LOWER(pa.email) as email,
    COALESCE(pa.turno, 'matutino') as turno,
    pa.nombre as nombre_alumno,
    true as activo,
    CURRENT_TIMESTAMP as created_at
FROM premed.alumnos pa
WHERE pa.activo = true 
  AND pa.status = 'activo'
  AND pa.email IS NOT NULL
  AND pa.email != ''
ON CONFLICT (email) 
DO UPDATE SET
    turno = EXCLUDED.turno,
    nombre_alumno = EXCLUDED.nombre_alumno,
    activo = EXCLUDED.activo,
    created_at = soporte.correos_autorizados.created_at; -- Mantener fecha original

-- PASO 3: Verificar resultados
SELECT 
    turno,
    activo,
    COUNT(*) as total
FROM soporte.correos_autorizados
GROUP BY turno, activo
ORDER BY turno, activo;

-- PASO 4: Ver total sincronizado
SELECT 
    'Total en premed.alumnos (activos)' as descripcion,
    COUNT(*) as total
FROM premed.alumnos
WHERE activo = true AND status = 'activo'

UNION ALL

SELECT 
    'Total en soporte.correos_autorizados (activos)' as descripcion,
    COUNT(*) as total
FROM soporte.correos_autorizados
WHERE activo = true;
