-- ============================================
-- SOLUCIÓN: Función RPC para obtener alumnos autorizados
-- Esta función permite que el rol 'anon' consulte alumnos
-- sin exponer directamente la tabla premed.alumnos
-- ============================================

-- Crear función con permisos elevados
CREATE OR REPLACE FUNCTION premed.get_alumnos_autorizados_asistencia()
RETURNS TABLE (
    email text,
    nombre text,
    turno text,
    modalidad text
)
LANGUAGE plpgsql
SECURITY DEFINER  -- Se ejecuta con permisos del propietario
SET search_path = premed, public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        LOWER(a.email) as email,
        a.nombre,
        a.turno,
        COALESCE(a.modalidad, 'presencial') as modalidad
    FROM premed.alumnos a
    WHERE a.activo = true 
      AND a.status = 'activo'
      AND a.email IS NOT NULL
      AND a.email != ''
      AND (
          a.turno = 'matutino'  -- Todos los matutinos
          OR 
          (a.turno = 'vespertino' AND a.modalidad = 'presencial')  -- Solo vespertino presencial
      )
    ORDER BY a.turno, a.email;
END;
$$;

-- Dar permisos de ejecución al rol anon y authenticated
GRANT EXECUTE ON FUNCTION premed.get_alumnos_autorizados_asistencia() TO anon;
GRANT EXECUTE ON FUNCTION premed.get_alumnos_autorizados_asistencia() TO authenticated;

-- Verificar que funciona
SELECT * FROM premed.get_alumnos_autorizados_asistencia()
LIMIT 10;
