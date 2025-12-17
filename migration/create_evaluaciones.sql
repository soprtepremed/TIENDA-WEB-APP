-- =====================================================================
-- Script SQL para crear la tabla evaluaciones
-- Esquema: soporte
-- =====================================================================

-- 1. CREACIÓN DE LA TABLA
-- =====================================================================
CREATE TABLE IF NOT EXISTS soporte.evaluaciones (
    id_registro BIGSERIAL PRIMARY KEY,
    
    -- ID del alumno (referencia)
    id VARCHAR(20) NOT NULL,
    nombres VARCHAR(255),
    
    -- Información del turno y modalidad
    turno VARCHAR(20),
    modalidad VARCHAR(20),
    
    -- Datos de la evaluación
    realizo_examen VARCHAR(10),
    calificacion DECIMAL(5,2),
    fecha_evaluacion DATE,
    
    -- Rango de la semana
    fecha_inicio DATE,
    fecha_final DATE,
    
    -- Estado de la evaluación
    estado VARCHAR(30),
    
    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. ÍNDICES PARA MEJORAR EL RENDIMIENTO DE CONSULTAS
-- =====================================================================
CREATE INDEX IF NOT EXISTS idx_evaluaciones_id 
    ON soporte.evaluaciones(id);

CREATE INDEX IF NOT EXISTS idx_evaluaciones_turno 
    ON soporte.evaluaciones(turno);

CREATE INDEX IF NOT EXISTS idx_evaluaciones_fecha_evaluacion 
    ON soporte.evaluaciones(fecha_evaluacion);

CREATE INDEX IF NOT EXISTS idx_evaluaciones_estado 
    ON soporte.evaluaciones(estado);

-- 3. HABILITAR RLS Y PERMISOS
-- =====================================================================
ALTER TABLE soporte.evaluaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura pública" 
ON soporte.evaluaciones 
FOR SELECT 
TO anon 
USING (true);

GRANT SELECT ON soporte.evaluaciones TO anon;

-- 4. COMENTARIO EN LA TABLA
-- =====================================================================
COMMENT ON TABLE soporte.evaluaciones IS 
    'Historial de evaluaciones de alumnos PREMED. Registra calificaciones, estado (APROBADO/NO APROBADO/NO REALIZÓ), y fechas de evaluación.';

-- =====================================================================
-- NOTAS IMPORTANTES:
-- =====================================================================
-- Los valores de estado son:
--   - 'APROBADO' (calificación >= 75)
--   - 'NO APROBADO' (calificación < 75)
--   - 'NO REALIZÓ' (no presentó el examen)
--
-- La columna 'id' corresponde al id_alumno de las tablas de asistencia
