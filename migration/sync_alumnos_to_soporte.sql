-- PASO UNICO: IMPORTACION MASIVA
-- Trae Matutinos (Todos) + Vespertinos (Solo Presenciales)

INSERT INTO soporte.correos_autorizados (email, turno, nombre_alumno, activo)
SELECT 
    email, 
    turno, 
    TRIM(COALESCE(nombre, '') || ' ' || COALESCE(apellido, '')) as nombre_alumno,
    activo
FROM premed.alumnos
WHERE activo = true 
  AND (
      (turno = 'vespertino' AND modalidad = 'presencial') -- Filtro estricto para Vespertino
      OR 
      (turno = 'matutino') -- Todos los Matutinos
  )
ON CONFLICT (email) DO UPDATE 
SET 
    turno = EXCLUDED.turno,
    nombre_alumno = EXCLUDED.nombre_alumno,
    activo = EXCLUDED.activo;

-- Verificación final
SELECT turno, count(*) FROM soporte.correos_autorizados GROUP BY turno;
