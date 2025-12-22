-- Modificar la restricción CHECK en pase_lista para permitir 'en_linea'
-- Actualmente solo permite 'matutino' y 'vespertino'.

ALTER TABLE soporte.pase_lista 
DROP CONSTRAINT IF EXISTS pase_lista_turno_oficial_check;

ALTER TABLE soporte.pase_lista 
ADD CONSTRAINT pase_lista_turno_oficial_check 
CHECK (turno_oficial IN ('matutino', 'vespertino', 'en_linea'));
