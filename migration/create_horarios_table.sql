-- =====================================================================
-- Tabla para guardar el Horario de Clases (Actualizado con Docente)
-- =====================================================================

DROP TABLE IF EXISTS soporte.horarios;

CREATE TABLE soporte.horarios (
    id BIGSERIAL PRIMARY KEY,
    turno VARCHAR(20) NOT NULL,
    dia VARCHAR(20) NOT NULL,
    hora_inicio VARCHAR(10) NOT NULL,
    materia VARCHAR(100) NOT NULL,
    docente VARCHAR(100), -- Nueva columna para el profesor
    color VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(turno, dia, hora_inicio)
);

-- Permisos
ALTER TABLE soporte.horarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir todo a usuarios anonimos y autenticados" 
ON soporte.horarios FOR ALL 
USING (true) 
WITH CHECK (true);

GRANT ALL ON soporte.horarios TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE soporte.horarios_id_seq TO anon, authenticated, service_role;
