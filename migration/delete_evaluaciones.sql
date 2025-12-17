-- =====================================================================
-- Script para actualizar las evaluaciones con calificaciones correctas
-- =====================================================================
-- Este script:
-- 1. Borra todos los registros existentes
-- 2. Inserta los datos con las calificaciones calculadas como porcentaje
-- =====================================================================

-- PASO 1: Borrar registros existentes
DELETE FROM soporte.evaluaciones WHERE turno = 'MATUTINO';

-- PASO 2: Los INSERTs están en insert_evaluaciones.sql
-- Ejecuta ese archivo después de este
