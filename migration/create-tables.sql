-- ============================================
-- Script de Creación de Tabla: asistencias
-- Base de Datos: Supabase
-- ============================================

-- Crear tabla de asistencias
CREATE TABLE IF NOT EXISTS asistencias (
    id SERIAL PRIMARY KEY,
    nombre_alumno TEXT NOT NULL,
    numero TEXT NOT NULL,
    correo_electronico TEXT,
    turno TEXT CHECK (turno IN ('Matutino', 'Vespertino')),
    lunes TEXT CHECK (lunes IN ('ASISTIÓ', 'NO ASISTIÓ')),
    martes TEXT CHECK (martes IN ('ASISTIÓ', 'NO ASISTIÓ')),
    miercoles TEXT CHECK (miercoles IN ('ASISTIÓ', 'NO ASISTIÓ')),
    jueves TEXT CHECK (jueves IN ('ASISTIÓ', 'NO ASISTIÓ')),
    viernes TEXT CHECK (viernes IN ('ASISTIÓ', 'NO ASISTIÓ')),
    fecha_inicio_semana DATE NOT NULL,
    fecha_fin_semana DATE NOT NULL,
    mes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear índices para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_asistencias_numero ON asistencias(numero);
CREATE INDEX IF NOT EXISTS idx_asistencias_nombre ON asistencias(nombre_alumno);
CREATE INDEX IF NOT EXISTS idx_asistencias_fecha_inicio ON asistencias(fecha_inicio_semana);
CREATE INDEX IF NOT EXISTS idx_asistencias_turno ON asistencias(turno);

-- Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para updated_at
CREATE TRIGGER update_asistencias_updated_at 
    BEFORE UPDATE ON asistencias 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios en la tabla
COMMENT ON TABLE asistencias IS 'Registro de asistencias semanales de alumnos';
COMMENT ON COLUMN asistencias.numero IS 'Número de identificación único del alumno (teléfono)';
COMMENT ON COLUMN asistencias.fecha_inicio_semana IS 'Fecha de inicio de la semana de asistencia';
COMMENT ON COLUMN asistencias.fecha_fin_semana IS 'Fecha de fin de la semana de asistencia';

-- ============================================
-- Row Level Security (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;

-- Política: Permitir lectura a usuarios autenticados
CREATE POLICY "Permitir lectura a todos los usuarios autenticados"
    ON asistencias
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Política: Permitir inserción a usuarios autenticados
CREATE POLICY "Permitir inserción a usuarios autenticados"
    ON asistencias
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Política: Permitir actualización a usuarios autenticados
CREATE POLICY "Permitir actualización a usuarios autenticados"
    ON asistencias
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Política: Permitir eliminación a usuarios autenticados
CREATE POLICY "Permitir eliminación a usuarios autenticados"
    ON asistencias
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- ============================================
-- Datos de Ejemplo (Opcional - Comentado)
-- ============================================

/*
INSERT INTO asistencias (
    nombre_alumno, 
    numero, 
    correo_electronico, 
    turno, 
    lunes, 
    martes, 
    miercoles, 
    jueves, 
    viernes, 
    fecha_inicio_semana, 
    fecha_fin_semana, 
    mes
) VALUES 
(
    'Andrea Aued Barajas Pérez',
    '5218611414359',
    'andreaued545@gmail.com',
    'Matutino',
    'ASISTIÓ',
    'ASISTIÓ',
    'ASISTIÓ',
    'ASISTIÓ',
    'NO ASISTIÓ',
    '2025-01-06',
    '2025-01-10',
    'enero'
);
*/

-- ============================================
-- Script de Creación de Tabla: evaluaciones
-- ============================================

CREATE TABLE IF NOT EXISTS evaluaciones (
    id_evaluacion SERIAL PRIMARY KEY,
    id INTEGER NOT NULL,
    nombres TEXT NOT NULL,
    turno TEXT CHECK (turno IN ('Matutino', 'Vespertino')),
    modalidad TEXT,
    realizo_examen TEXT CHECK (realizo_examen IN ('Sí', 'No', 'SI', 'NO')),
    calificacion NUMERIC(5,2),
    fecha_evaluacion DATE,
    fecha_inicio DATE,
    fecha_final DATE,
    estado TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Crear índices para optimizar búsquedas en evaluaciones
CREATE INDEX IF NOT EXISTS idx_evaluaciones_id ON evaluaciones(id);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_nombres ON evaluaciones(nombres);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_fecha_evaluacion ON evaluaciones(fecha_evaluacion);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_estado ON evaluaciones(estado);
CREATE INDEX IF NOT EXISTS idx_evaluaciones_turno ON evaluaciones(turno);

-- Crear trigger para updated_at en evaluaciones
CREATE TRIGGER update_evaluaciones_updated_at 
    BEFORE UPDATE ON evaluaciones 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios en la tabla evaluaciones
COMMENT ON TABLE evaluaciones IS 'Registro de exámenes y evaluaciones de alumnos';
COMMENT ON COLUMN evaluaciones.id IS 'ID del alumno (relacionado con asistencias)';
COMMENT ON COLUMN evaluaciones.realizo_examen IS 'Indica si el alumno realizó el examen';
COMMENT ON COLUMN evaluaciones.calificacion IS 'Calificación obtenida en el examen';

-- ============================================
-- Row Level Security (RLS) para evaluaciones
-- ============================================

-- Habilitar RLS
ALTER TABLE evaluaciones ENABLE ROW LEVEL SECURITY;

-- Política: Permitir lectura a usuarios autenticados
CREATE POLICY "Permitir lectura a todos los usuarios autenticados en evaluaciones"
    ON evaluaciones
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Política: Permitir inserción a usuarios autenticados
CREATE POLICY "Permitir inserción a usuarios autenticados en evaluaciones"
    ON evaluaciones
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Política: Permitir actualización a usuarios autenticados
CREATE POLICY "Permitir actualización a usuarios autenticados en evaluaciones"
    ON evaluaciones
    FOR UPDATE
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');

-- Política: Permitir eliminación a usuarios autenticados
CREATE POLICY "Permitir eliminación a usuarios autenticados en evaluaciones"
    ON evaluaciones
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- ============================================
-- Datos de Ejemplo para evaluaciones (Opcional - Comentado)
-- ============================================

/*
INSERT INTO evaluaciones (
    id,
    nombres,
    turno,
    modalidad,
    realizo_examen,
    calificacion,
    fecha_evaluacion,
    fecha_inicio,
    fecha_final,
    estado
) VALUES 
(
    5218611414359,
    'Andrea Aued Barajas Pérez',
    'Matutino',
    'Presencial',
    'Sí',
    9.5,
    '2025-01-15',
    '2025-01-06',
    '2025-01-10',
    'Aprobado'
);
*/

-- ============================================
-- Vista Unificada: Información Completa del Alumno
-- ============================================

CREATE OR REPLACE VIEW vista_alumno_completo AS
SELECT DISTINCT
    a.numero as alumno_id,
    a.nombre_alumno,
    a.correo_electronico,
    a.turno,
    COUNT(DISTINCT a.id) as total_semanas_registradas,
    COUNT(DISTINCT e.id_evaluacion) as total_evaluaciones,
    AVG(e.calificacion) as promedio_calificaciones
FROM asistencias a
LEFT JOIN evaluaciones e ON a.numero::text = e.id::text
GROUP BY a.numero, a.nombre_alumno, a.correo_electronico, a.turno;

COMMENT ON VIEW vista_alumno_completo IS 'Vista consolidada con información resumida de cada alumno';

