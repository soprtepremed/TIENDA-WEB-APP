-- =====================================================================
-- Script SQL para crear e insertar datos en la tabla historico_asistencia_presencial
-- Esquema: soporte
-- =====================================================================

-- 1. CREACIÓN DE LA TABLA
-- =====================================================================
CREATE TABLE IF NOT EXISTS soporte.historico_asistencia_presencial (
    id BIGSERIAL PRIMARY KEY,
    
    -- Información del alumno
    id_alumno VARCHAR(20) NOT NULL,
    nombre_alumno VARCHAR(255) NOT NULL,
    numero_telefono VARCHAR(20),
    correo_electronico VARCHAR(255),
    turno VARCHAR(20) NOT NULL,
    
    -- Asistencia por día de la semana (ASISTIÓ / NO ASISTIÓ)
    lunes VARCHAR(20),
    martes VARCHAR(20),
    miercoles VARCHAR(20),
    jueves VARCHAR(20),
    viernes VARCHAR(20),
    
    -- Rango de la semana
    fecha_inicio_semana DATE,
    fecha_fin_semana DATE,
    mes VARCHAR(20),
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ÍNDICES PARA MEJORAR EL RENDIMIENTO DE CONSULTAS
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_historico_presencial_id_alumno 
    ON soporte.historico_asistencia_presencial(id_alumno);

CREATE INDEX IF NOT EXISTS idx_historico_presencial_correo 
    ON soporte.historico_asistencia_presencial(correo_electronico);

CREATE INDEX IF NOT EXISTS idx_historico_presencial_turno 
    ON soporte.historico_asistencia_presencial(turno);

CREATE INDEX IF NOT EXISTS idx_historico_presencial_fecha_inicio 
    ON soporte.historico_asistencia_presencial(fecha_inicio_semana);

CREATE INDEX IF NOT EXISTS idx_historico_presencial_mes 
    ON soporte.historico_asistencia_presencial(mes);

-- 3. COMENTARIO EN LA TABLA
-- =====================================================================
COMMENT ON TABLE soporte.historico_asistencia_presencial IS 
    'Historial de asistencia presencial de alumnos PREMED. Registra asistencia semanal (ASISTIÓ / NO ASISTIÓ) para turnos Matutino y Vespertino.';

-- =====================================================================
-- NOTAS IMPORTANTES:
-- =====================================================================
-- Los valores de asistencia son binarios:
--   - 'ASISTIÓ'
--   - 'NO ASISTIÓ'
--   - NULL (cuando no hay registro para ese día)
--
-- Esta tabla es diferente a historico_asistencia_en_linea porque:
--   1. No incluye tiempos de permanencia
--   2. Los valores son solo ASISTIÓ / NO ASISTIÓ
--   3. Es para el registro de asistencia presencial
