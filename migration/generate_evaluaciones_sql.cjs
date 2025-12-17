/**
 * Script para generar SQL de evaluaciones desde CSV
 * Ejecutar: node generate_evaluaciones_sql.cjs
 */

const fs = require('fs');
const path = require('path');

// Leer el archivo CSV
const csvPath = path.join(__dirname, 'evaluacionesMAT.csv');
const csvContent = fs.readFileSync(csvPath, 'utf-8');

// Parsear líneas
const lines = csvContent.split('\n').filter(line => line.trim());

// Arreglo para almacenar los INSERTs
const inserts = [];

lines.forEach((line, index) => {
    // Separar por comas (cuidado con nombres que contienen comas)
    const parts = line.split(',');

    // Ignorar filas de encabezado
    if (parts[0] === 'ID' || parts[0].trim() === '') return;

    // Validar que el ID sea numérico
    const id = parts[0].trim();
    if (!/^\d+$/.test(id)) return;

    const nombre = parts[1] ? parts[1].trim().replace(/'/g, "''") : null;
    const turno = parts[2] ? parts[2].trim() : null;
    const modalidad = parts[3] ? parts[3].trim() : null;
    const realizoExamen = parts[4] ? parts[4].trim() : null;

    // Procesar calificación (formato "79/90" -> extraer el número)
    let calificacion = null;
    if (parts[5] && parts[5].trim()) {
        const calStr = parts[5].trim();
        if (calStr.includes('/')) {
            calificacion = parseFloat(calStr.split('/')[0]);
        } else {
            calificacion = parseFloat(calStr);
        }
        if (isNaN(calificacion)) calificacion = null;
    }

    // Procesar fechas (formato DD/MM/YYYY -> YYYY-MM-DD)
    function parseDate(dateStr) {
        if (!dateStr || dateStr.trim() === '') return null;
        const parts = dateStr.trim().split('/');
        if (parts.length !== 3) return null;
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
    }

    const fechaEval = parseDate(parts[6]);
    const fechaInicio = parseDate(parts[7]);
    const fechaFinal = parseDate(parts[8]);

    const estado = parts[9] ? parts[9].trim() : null;

    // Generar INSERT
    const nombreValue = nombre ? `'${nombre}'` : 'NULL';
    const turnoValue = turno ? `'${turno}'` : 'NULL';
    const modalidadValue = modalidad ? `'${modalidad}'` : 'NULL';
    const realizoValue = realizoExamen ? `'${realizoExamen}'` : 'NULL';
    const calValue = calificacion !== null ? calificacion : 'NULL';
    const fechaEvalValue = fechaEval ? `'${fechaEval}'` : 'NULL';
    const fechaInicioValue = fechaInicio ? `'${fechaInicio}'` : 'NULL';
    const fechaFinalValue = fechaFinal ? `'${fechaFinal}'` : 'NULL';
    const estadoValue = estado ? `'${estado}'` : 'NULL';

    const insert = `INSERT INTO soporte.evaluaciones (id, nombres, turno, modalidad, realizo_examen, calificacion, fecha_evaluacion, fecha_inicio, fecha_final, estado) VALUES (
  '${id}', ${nombreValue}, ${turnoValue}, ${modalidadValue},
  ${realizoValue}, ${calValue}, ${fechaEvalValue},
  ${fechaInicioValue}, ${fechaFinalValue}, ${estadoValue}
);`;

    inserts.push(insert);
});

// Generar archivo SQL
const sqlContent = `-- =====================================================================
-- SQL para insertar evaluaciones
-- Generado automáticamente desde: evaluacionesMAT.csv
-- =====================================================================
-- IMPORTANTE: Ejecuta PRIMERO create_evaluaciones.sql para crear la tabla
-- =====================================================================
-- Total de registros: ${inserts.length}
-- =====================================================================

${inserts.join('\n\n')}
`;

// Guardar archivo
const outputPath = path.join(__dirname, 'insert_evaluaciones.sql');
fs.writeFileSync(outputPath, sqlContent, 'utf-8');

console.log(`✅ Archivo generado: insert_evaluaciones.sql`);
console.log(`📊 Total de registros: ${inserts.length}`);
