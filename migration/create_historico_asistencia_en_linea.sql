-- =====================================================================
-- Script SQL para crear e insertar datos en la tabla historico_asistencia_en_linea
-- Esquema: soporte
-- =====================================================================

-- 1. CREACIÓN DE LA TABLA
-- =====================================================================
CREATE TABLE IF NOT EXISTS soporte.historico_asistencia_en_linea (
    id BIGSERIAL PRIMARY KEY,
    
    -- Información del alumno
    id_alumno VARCHAR(20) NOT NULL,
    nombre_alumno VARCHAR(255) NOT NULL,
    numero_telefono VARCHAR(20),
    correo_electronico VARCHAR(255),
    turno VARCHAR(20) NOT NULL,
    
    -- Asistencia por día de la semana
    lunes VARCHAR(50),
    tiempo_lunes VARCHAR(20),
    martes VARCHAR(50),
    tiempo_martes VARCHAR(20),
    miercoles VARCHAR(50),
    tiempo_miercoles VARCHAR(20),
    jueves VARCHAR(50),
    tiempo_jueves VARCHAR(20),
    viernes VARCHAR(50),
    tiempo_viernes VARCHAR(20),
    
    -- Rango de la semana
    fecha_inicio_semana DATE,
    fecha_fin_semana DATE,
    mes VARCHAR(20),
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ÍNDICES PARA MEJORAR EL RENDIMIENTO DE CONSULTAS
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_historico_asistencia_id_alumno 
    ON soporte.historico_asistencia_en_linea(id_alumno);

CREATE INDEX IF NOT EXISTS idx_historico_asistencia_correo 
    ON soporte.historico_asistencia_en_linea(correo_electronico);

CREATE INDEX IF NOT EXISTS idx_historico_asistencia_turno 
    ON soporte.historico_asistencia_en_linea(turno);

CREATE INDEX IF NOT EXISTS idx_historico_asistencia_fecha_inicio 
    ON soporte.historico_asistencia_en_linea(fecha_inicio_semana);

CREATE INDEX IF NOT EXISTS idx_historico_asistencia_mes 
    ON soporte.historico_asistencia_en_linea(mes);

-- 3. COMENTARIO EN LA TABLA
-- =====================================================================
COMMENT ON TABLE soporte.historico_asistencia_en_linea IS 
    'Historial de asistencia en línea de alumnos PREMED. Registra asistencia semanal con tiempos de permanencia.';

-- 4. HABILITAR RLS (Row Level Security) - Opcional
-- =====================================================================
-- ALTER TABLE soporte.historico_asistencia_en_linea ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- NOTAS IMPORTANTES:
-- =====================================================================
-- Los valores de asistencia pueden ser:
--   - 'Asistencia Completa'
--   - 'Asistencia Parcial' 
--   - 'Asistencia Incompleta'
--   - 'NO ASISTIÓ'
--   - NULL (cuando no hay registro)
--
-- Los tiempos están en formato HH:MM:SS (ej: '4:12:57')
--
-- Para importar los datos del CSV, usa el siguiente formato de INSERT:
--
-- INSERT INTO soporte.historico_asistencia_en_linea 
--   (id_alumno, nombre_alumno, numero_telefono, correo_electronico, turno,
--    lunes, tiempo_lunes, martes, tiempo_martes, miercoles, tiempo_miercoles,
--    jueves, tiempo_jueves, viernes, tiempo_viernes,
--    fecha_inicio_semana, fecha_fin_semana, mes)
-- VALUES 
--   ('33404481', 'Abril Saraí Álvarez Pérez', '5219191734206', 'parkjeonabi@gmail.com', 'Vespertino',
--    'NO ASISTIÓ', NULL, 'Asistencia Completa', '4:12:57', 'Asistencia Completa', '3:57:14',
--    'Asistencia Completa', '3:53:19', 'Asistencia Completa', '4:04:23',
--    '2025-10-20', '2025-10-24', 'octubre');
