-- Permite que el rol público (anon) pueda leer la tabla de alumnos en el esquema 'premed'
-- Esto es necesario para que el Javascript pueda consultar la lista directamente

GRANT USAGE ON SCHEMA premed TO anon;
GRANT SELECT ON TABLE premed.alumnos TO anon;

-- Opcional: Si tienes RLS (Row Level Security) activado en esa tabla, 
-- necesitarías también una policy, pero primero prueba con los GRANTS.
