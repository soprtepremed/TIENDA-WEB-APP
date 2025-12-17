-- =====================================================================
-- Script para convertir historico_asistencia_presencial en una VISTA DINÁMICA
-- Conecta los registros diarios (soporte.registros) con el reporte histórico
-- =====================================================================

-- 1. Eliminar la tabla vacía existente (si existe)
DROP TABLE IF EXISTS soporte.historico_asistencia_presencial;

-- 2. Crear la VISTA dinámica
CREATE OR REPLACE VIEW soporte.historico_asistencia_presencial AS
SELECT
    -- Generar un ID único basado en alumno y semana (útil para frontend)
    row_number() OVER (ORDER BY r.fecha DESC) as id,
    
    -- Datos del Alumno
    r.id_alumno,
    r.nombre_alumno,
    r.turno, -- MATUTINO / VESPERTINO
    
    -- Cálculos de la Semana
    -- Ajustamos al Lunes de esa semana
    (date_trunc('week', r.fecha) + interval '0 day')::date as fecha_inicio_semana,
    -- Viernes de esa semana
    (date_trunc('week', r.fecha) + interval '4 days')::date as fecha_fin_semana,
    
    -- Nombre del Mes (en español si está configurado, o inglés)
    to_char(r.fecha, 'Month') as mes,
    
    -- Pivote de Asistencias (Lunes a Viernes)
    MAX(CASE WHEN extract(isodow from r.fecha) = 1 THEN r.estado END) as lunes,
    MAX(CASE WHEN extract(isodow from r.fecha) = 2 THEN r.estado END) as martes,
    MAX(CASE WHEN extract(isodow from r.fecha) = 3 THEN r.estado END) as miercoles,
    MAX(CASE WHEN extract(isodow from r.fecha) = 4 THEN r.estado END) as jueves,
    MAX(CASE WHEN extract(isodow from r.fecha) = 5 THEN r.estado END) as viernes

FROM 
    soporte.registros r
WHERE 
    r.turno IN ('MATUTINO', 'VESPERTINO') -- Solo presenciales
GROUP BY 
    r.id_alumno, 
    r.nombre_alumno, 
    r.turno, 
    date_trunc('week', r.fecha);

-- 3. Permisos de Seguridad (RLS y Accesos)
-- Permitir lectura a la API anónima
GRANT SELECT ON soporte.historico_asistencia_presencial TO anon;
GRANT SELECT ON soporte.historico_asistencia_presencial TO authenticated;
GRANT SELECT ON soporte.historico_asistencia_presencial TO service_role;

-- Nota: Para que la vista funcione, el usuario anon necesita select en soporte.registros también
GRANT SELECT ON soporte.registros TO anon;

COMMENT ON VIEW soporte.historico_asistencia_presencial IS 
    'Vista dinámica que agrupa los registros diarios de asistencia en formato semanal.';
