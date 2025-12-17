-- =====================================================================
-- Script para corregir estados de evaluaciones
-- Regla: >= 75% = APROBADO, < 75% = NO APROBADO, NULL = NO REALIZÓ
-- =====================================================================

-- Corregir estados basándose en la calificación (regla >= 75%)
UPDATE soporte.evaluaciones
SET estado = CASE 
    WHEN calificacion IS NULL THEN 'NO REALIZÓ'
    WHEN calificacion >= 75 THEN 'APROBADO'
    ELSE 'NO APROBADO'
END;

-- Verificar resultados
SELECT 
    estado,
    COUNT(*) as cantidad,
    ROUND(AVG(calificacion)::numeric, 1) as promedio_calif
FROM soporte.evaluaciones
GROUP BY estado
ORDER BY 
    CASE estado 
        WHEN 'APROBADO' THEN 1 
        WHEN 'NO APROBADO' THEN 2 
        ELSE 3 
    END;
