-- =====================================================================
-- CORRECCIÓN: Script para Vista Dinámica con JOIN a premed.alumnos
-- =====================================================================

DROP VIEW IF EXISTS soporte.historico_asistencia_presencial;
DROP TABLE IF EXISTS soporte.historico_asistencia_presencial;

CREATE OR REPLACE VIEW soporte.historico_asistencia_presencial AS
SELECT
    -- ID único para la vista (necesario para selects)
    row_number() OVER (ORDER BY r.fecha DESC, a.nombre ASC) as id,
    
    -- ID del Alumno (Extraído de la tabla maestra de alumnos)
    -- Si no lo encuentra, usa "--"
    COALESCE(CAST(a.id AS VARCHAR), '--') as id_alumno,
    
    -- Nombre del Alumno
    -- Si no cruza, muestra el correo para identificar el error
    COALESCE(a.nombre, r.email) as nombre_alumno,
    
    r.turno, -- Turno registrado
    
    -- Cálculo de fechas de la semana (Lunes y Viernes)
    (date_trunc('week', r.fecha) + interval '0 day')::date as fecha_inicio_semana,
    (date_trunc('week', r.fecha) + interval '4 days')::date as fecha_fin_semana,
    
    -- Mes
    to_char(r.fecha, 'Month') as mes,
    
    -- ASISTENCIAS (Si existe el registro, cuenta como 'ASISTIÓ')
    -- Aquí podrías agregar lógica futura para 'RETARDO' basada en la hora (r.timestamp)
    MAX(CASE WHEN extract(isodow from r.fecha) = 1 THEN 'ASISTIÓ' END) as lunes,
    MAX(CASE WHEN extract(isodow from r.fecha) = 2 THEN 'ASISTIÓ' END) as martes,
    MAX(CASE WHEN extract(isodow from r.fecha) = 3 THEN 'ASISTIÓ' END) as miercoles,
    MAX(CASE WHEN extract(isodow from r.fecha) = 4 THEN 'ASISTIÓ' END) as jueves,
    MAX(CASE WHEN extract(isodow from r.fecha) = 5 THEN 'ASISTIÓ' END) as viernes

FROM 
    soporte.registros r
    -- Hacemos LEFT JOIN para no perder asistencias de alumnos que quizás se borraron de la maestra
    LEFT JOIN premed.alumnos a ON LOWER(a.email) = LOWER(r.email)

WHERE 
    r.turno IN ('matutino', 'vespertino', 'MATUTINO', 'VESPERTINO') -- Cubrir variaciones
    
GROUP BY 
    a.id,
    a.nombre,
    r.email,
    r.turno,
    date_trunc('week', r.fecha);

-- Permisos
GRANT SELECT ON soporte.historico_asistencia_presencial TO anon;
GRANT SELECT ON soporte.historico_asistencia_presencial TO authenticated;
GRANT SELECT ON soporte.historico_asistencia_presencial TO service_role;

COMMENT ON VIEW soporte.historico_asistencia_presencial IS 
    'Vista dinámica que cruza registros de asistencia con datos del alumno por correo.';
