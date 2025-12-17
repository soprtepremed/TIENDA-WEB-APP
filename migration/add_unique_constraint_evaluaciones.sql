-- =====================================================================
-- Script para evitar duplicados en Evaluaciones
-- Crea un índice único compuesto por (id, fecha_evaluacion)
-- =====================================================================

-- 1. Eliminar duplicados existentes (si los hubiera) antes de crear el índice
-- Mantiene el registro más reciente (CTID más alto)
DELETE FROM soporte.evaluaciones a USING (
    SELECT MIN(ctid) as ctid, id, fecha_evaluacion
    FROM soporte.evaluaciones 
    GROUP BY id, fecha_evaluacion
    HAVING COUNT(*) > 1
) b
WHERE a.id = b.id 
AND a.fecha_evaluacion = b.fecha_evaluacion 
AND a.ctid <> b.ctid;

-- 2. Crear el índice único
-- Esto asegura que no pueda haber dos registros con el mismo alumno y la misma fecha
ALTER TABLE soporte.evaluaciones
ADD CONSTRAINT evaluaciones_id_fecha_key UNIQUE (id, fecha_evaluacion);
