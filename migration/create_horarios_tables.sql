-- Crear tabla para guardar los horarios actuales
CREATE TABLE IF NOT EXISTS soporte.horarios_curso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dia TEXT NOT NULL,
    hora TEXT NOT NULL,
    grupo TEXT NOT NULL,
    materia TEXT,
    profesor TEXT,
    last_updated TIMESTAMP DEFAULT NOW(),
    last_updated_by TEXT,
    CONSTRAINT unique_horario UNIQUE (dia, hora, grupo)
);

-- Crear tabla para el histórico de movimientos
CREATE TABLE IF NOT EXISTS soporte.historico_movimientos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha TIMESTAMP DEFAULT NOW(),
    usuario TEXT,
    accion TEXT,
    detalle TEXT,
    tipo TEXT DEFAULT 'Horario'
);

-- Habilitar permisos (si es necesario ajustar RLS, aquí un ejemplo básico público para autenticados)
-- ALTER TABLE soporte.horarios_curso ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable read/write for authenticated users" ON soporte.horarios_curso USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
