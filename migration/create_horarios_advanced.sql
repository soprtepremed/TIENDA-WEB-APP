-- =====================================================================
-- 1. TABLA PRINCIPAL: HORARIOS
-- =====================================================================
DROP TABLE IF EXISTS soporte.horarios CASCADE;

CREATE TABLE soporte.horarios (
    id BIGSERIAL PRIMARY KEY,
    turno VARCHAR(20) NOT NULL,      -- 'matutino', 'vespertino'
    dia VARCHAR(20) NOT NULL,        -- 'lunes', 'martes'...
    hora_inicio VARCHAR(10) NOT NULL,-- '08:00'
    materia VARCHAR(100) NOT NULL,
    docente VARCHAR(100),            -- NOMBRE DEL DOCENTE
    color VARCHAR(20),
    modificado_por VARCHAR(100) DEFAULT 'Sistema', -- Para saber usuario (opcional futuro)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    
    -- Evitar empalmes: Mismo turno, día y hora solo puede tener una clase
    UNIQUE(turno, dia, hora_inicio)
);

-- =====================================================================
-- 2. TABLA DE HISTORIAL (AUDITORÍA)
-- =====================================================================
DROP TABLE IF EXISTS soporte.log_horarios;

CREATE TABLE soporte.log_horarios (
    id BIGSERIAL PRIMARY KEY,
    accion VARCHAR(10) NOT NULL,     -- 'INSERT', 'UPDATE', 'DELETE'
    horario_id BIGINT,               -- ID del registro afectado
    turno VARCHAR(20),
    dia VARCHAR(20),
    hora VARCHAR(10),
    materia_anterior VARCHAR(100),
    materia_nueva VARCHAR(100),
    docente_anterior VARCHAR(100),
    docente_nuevo VARCHAR(100),
    usuario_responsable VARCHAR(100),
    fecha_movimiento TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================================
-- 3. TRIGGER (Automatización del Historial)
-- =====================================================================
CREATE OR REPLACE FUNCTION soporte.fn_log_horarios()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO soporte.log_horarios (accion, horario_id, turno, dia, hora, materia_nueva, docente_nuevo)
        VALUES ('CREAR', NEW.id, NEW.turno, NEW.dia, NEW.hora_inicio, NEW.materia, NEW.docente);
        RETURN NEW;
        
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO soporte.log_horarios (accion, horario_id, turno, dia, hora, 
                                          materia_anterior, materia_nueva, 
                                          docente_anterior, docente_nuevo)
        VALUES ('MODIFICAR', NEW.id, NEW.turno, NEW.dia, NEW.hora_inicio, 
                OLD.materia, NEW.materia, 
                OLD.docente, NEW.docente);
        RETURN NEW;
        
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO soporte.log_horarios (accion, horario_id, turno, dia, hora, materia_anterior, docente_anterior)
        VALUES ('ELIMINAR', OLD.id, OLD.turno, OLD.dia, OLD.hora_inicio, OLD.materia, OLD.docente);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Activar el Trigger
DROP TRIGGER IF EXISTS tr_log_horarios ON soporte.horarios;
CREATE TRIGGER tr_log_horarios
AFTER INSERT OR UPDATE OR DELETE ON soporte.horarios
FOR EACH ROW EXECUTE FUNCTION soporte.fn_log_horarios();

-- =====================================================================
-- 4. PERMISOS
-- =====================================================================
ALTER TABLE soporte.horarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE soporte.log_horarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acceso total horarios" ON soporte.horarios FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Lectura logs" ON soporte.log_horarios FOR SELECT USING (true);
CREATE POLICY "Escritura logs trigger" ON soporte.log_horarios FOR INSERT WITH CHECK (true);

GRANT ALL ON soporte.horarios TO anon, authenticated, service_role;
GRANT ALL ON soporte.log_horarios TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA soporte TO anon, authenticated, service_role;

COMMENT ON TABLE soporte.log_horarios IS 'Historial automático de todos los cambios en el horario.';
