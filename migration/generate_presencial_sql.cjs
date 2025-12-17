/**
 * Script para generar sentencias SQL INSERT desde los CSVs de historial de asistencia presencial
 * 
 * Uso: node generate_presencial_sql.cjs
 * 
 * Procesa:
 *   - Registro de Asistencia PREMED - Historico Matutino Presencial .csv
 *   - Registro de Asistencia PREMED - Historico Vespertino Presencial .csv
 * 
 * Genera: insert_historico_presencial.sql
 */

const fs = require('fs');
const path = require('path');

// Archivos de entrada
const inputFiles = [
    'Registro de Asistencia PREMED - Historico Matutino Presencial .csv',
    'Registro de Asistencia PREMED - Historico Vespertino Presencial .csv'
];

// Archivo de salida
const outputFile = path.join(__dirname, 'insert_historico_presencial.sql');

/**
 * Escapa comillas simples para SQL
 */
function escapeSql(value) {
    if (value === null || value === undefined || value === '') {
        return 'NULL';
    }
    // Escapa comillas simples duplicándolas
    const escaped = String(value).replace(/'/g, "''").trim();
    return `'${escaped}'`;
}

/**
 * Convierte una fecha del formato DD/MM/YYYY a YYYY-MM-DD
 */
function parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') {
        return 'NULL';
    }

    const cleaned = dateStr.trim();
    const parts = cleaned.split('/');

    if (parts.length !== 3) {
        console.warn(`Fecha inválida: ${dateStr}`);
        return 'NULL';
    }

    let [day, month, year] = parts;

    // Corregir el año si tiene formato incorrecto (como 20205)
    if (year.length > 4) {
        year = '2025'; // Corregir a 2025
    }

    // Asegurar formato de 2 dígitos
    day = day.padStart(2, '0');
    month = month.padStart(2, '0');

    return `'${year}-${month}-${day}'`;
}

/**
 * Procesa el valor de asistencia (ASISTIÓ / NO ASISTIÓ)
 */
function processAttendance(value) {
    if (!value || value.trim() === '' || value.trim() === ',') {
        return 'NULL';
    }
    const cleaned = value.trim();
    if (cleaned === 'ASISTIÓ' || cleaned === 'NO ASISTIÓ') {
        return escapeSql(cleaned);
    }
    return 'NULL';
}

/**
 * Parsea una línea CSV teniendo en cuenta comillas
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current);

    return result;
}

/**
 * Procesa un archivo CSV y genera sentencias INSERT
 */
function processCSVFile(filePath) {
    console.log(`Procesando: ${filePath}`);

    const csvContent = fs.readFileSync(filePath, 'utf-8');
    const lines = csvContent.split('\n');

    console.log(`  Total de líneas: ${lines.length}`);

    let inserts = [];
    let insertCount = 0;
    let skipCount = 0;

    // Saltar encabezado
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].replace('\r', '').trim();

        if (!line) continue;

        try {
            const values = parseCSVLine(line);

            // Verificar que tenemos datos válidos (al menos ID y nombre)
            if (!values[0] || values[0].trim() === '' || !values[1] || values[1].trim() === '') {
                skipCount++;
                continue;
            }

            // Verificar que tenemos suficientes columnas
            if (values.length < 11) {
                console.warn(`  Línea ${i + 1}: Columnas insuficientes (${values.length})`);
                skipCount++;
                continue;
            }

            // Extraer datos según la estructura del CSV:
            // ID, NOMBRE DEL ALUMNO, NUMERO, CORREO ELECTRONICO, TURNO,
            // LUNES, MARTES, MIERCOLES, JUEVES, VIERNES, 
            // FECHA DE INICIO DE SEMANA, FECHA DE FIN DE SEMANA, MES

            const id_alumno = escapeSql(values[0]);
            const nombre_alumno = escapeSql(values[1]);
            const numero_telefono = escapeSql(values[2]);
            const correo_electronico = escapeSql(values[3]);
            const turno = escapeSql(values[4]);

            const lunes = processAttendance(values[5]);
            const martes = processAttendance(values[6]);
            const miercoles = processAttendance(values[7]);
            const jueves = processAttendance(values[8]);
            const viernes = processAttendance(values[9]);

            const fecha_inicio_semana = parseDate(values[10]);
            const fecha_fin_semana = parseDate(values[11]);
            const mes = values[12] ? escapeSql(values[12].trim()) : 'NULL';

            // Solo generar INSERT si hay al menos una fecha válida
            if (fecha_inicio_semana === 'NULL' && fecha_fin_semana === 'NULL') {
                skipCount++;
                continue;
            }

            // Generar INSERT
            const insert = `INSERT INTO soporte.historico_asistencia_presencial 
  (id_alumno, nombre_alumno, numero_telefono, correo_electronico, turno,
   lunes, martes, miercoles, jueves, viernes,
   fecha_inicio_semana, fecha_fin_semana, mes)
VALUES 
  (${id_alumno}, ${nombre_alumno}, ${numero_telefono}, ${correo_electronico}, ${turno},
   ${lunes}, ${martes}, ${miercoles}, ${jueves}, ${viernes},
   ${fecha_inicio_semana}, ${fecha_fin_semana}, ${mes});`;

            inserts.push(insert);
            insertCount++;

        } catch (error) {
            console.error(`  Error en línea ${i + 1}: ${error.message}`);
            skipCount++;
        }
    }

    console.log(`  ✓ Registros válidos: ${insertCount}`);
    console.log(`  ✗ Registros omitidos: ${skipCount}`);

    return inserts;
}

/**
 * Función principal
 */
function main() {
    console.log('=================================');
    console.log('Generador de SQL - Asistencia Presencial');
    console.log('=================================\n');

    // Preparar el archivo de salida
    let sqlOutput = `-- =====================================================================
-- Script SQL para insertar datos en soporte.historico_asistencia_presencial
-- Generado automáticamente el ${new Date().toISOString()}
-- =====================================================================

-- Primero ejecuta create_historico_asistencia_presencial.sql para crear la tabla

`;

    let totalInserts = 0;

    // Procesar cada archivo CSV
    for (const file of inputFiles) {
        const filePath = path.join(__dirname, file);

        if (!fs.existsSync(filePath)) {
            console.warn(`⚠️ Archivo no encontrado: ${file}`);
            continue;
        }

        sqlOutput += `-- =====================================================================\n`;
        sqlOutput += `-- Datos de: ${file}\n`;
        sqlOutput += `-- =====================================================================\n\n`;

        const inserts = processCSVFile(filePath);
        sqlOutput += inserts.join('\n\n') + '\n\n';
        totalInserts += inserts.length;
    }

    // Escribir archivo de salida
    fs.writeFileSync(outputFile, sqlOutput);

    console.log('\n=================================');
    console.log('Resumen de la generación:');
    console.log('=================================');
    console.log(`✓ Total de registros procesados: ${totalInserts}`);
    console.log(`\nArchivo generado: ${outputFile}`);
    console.log('\nPasos siguientes:');
    console.log('1. Ejecuta primero: create_historico_asistencia_presencial.sql');
    console.log('2. Luego ejecuta: insert_historico_presencial.sql');
}

main();
