/**
 * Script para generar sentencias SQL INSERT desde el CSV de historial de asistencia
 * 
 * Uso: node generate_historico_sql.js
 * 
 * Genera el archivo: insert_historico_asistencia.sql
 */

const fs = require('fs');
const path = require('path');

// Archivo de entrada y salida
const inputFile = path.join(__dirname, 'Registro de Asistencia PREMED - Historico de Asistencia en linea.csv');
const outputFile = path.join(__dirname, 'insert_historico_asistencia.sql');

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
 * Procesa el valor de asistencia
 */
function processAttendance(value) {
    if (!value || value.trim() === '' || value.trim() === ',') {
        return 'NULL';
    }
    const cleaned = value.trim();
    if (cleaned === 'NO ASISTIÓ') {
        return "'NO ASISTIÓ'";
    }
    return escapeSql(cleaned);
}

/**
 * Procesa el tiempo de reunión
 */
function processTime(value) {
    if (!value || value.trim() === '' || value.trim() === ',') {
        return 'NULL';
    }
    return escapeSql(value.trim());
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
 * Función principal
 */
function main() {
    console.log('Leyendo archivo CSV...');

    // Leer el archivo CSV
    const csvContent = fs.readFileSync(inputFile, 'utf-8');
    const lines = csvContent.split('\n');

    console.log(`Total de líneas en el archivo: ${lines.length}`);

    // Obtener encabezados
    const headers = parseCSVLine(lines[0].replace('\r', ''));
    console.log('Encabezados encontrados:', headers.slice(0, 10).join(', '));

    // Preparar el archivo de salida
    let sqlOutput = `-- =====================================================================
-- Script SQL para insertar datos en soporte.historico_asistencia_en_linea
-- Generado automáticamente el ${new Date().toISOString()}
-- =====================================================================

-- Primero ejecuta create_historico_asistencia_en_linea.sql para crear la tabla

`;

    let insertCount = 0;
    let errorCount = 0;

    // Procesar cada línea de datos
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].replace('\r', '').trim();

        if (!line) continue;

        try {
            const values = parseCSVLine(line);

            // Verificar que tenemos suficientes columnas
            if (values.length < 16) {
                console.warn(`Línea ${i + 1}: Columnas insuficientes (${values.length})`);
                continue;
            }

            // Extraer datos según la estructura del CSV:
            // ID, NOMBRE DEL ALUMNO, NUMERO, CORREO ELECTRONICO, TURNO,
            // LUNES, TIEMPO EN LA REUNIÓN 1, MARTES, TIEMPO EN LA REUNIÓN 2, 
            // MIERCOLES, TIEMPO EN LA REUNIÓN 3, JUEVES, TIEMPO EN LA REUNIÓN 4, 
            // VIERNES, TIEMPO EN LA REUNIÓN 5, FECHA DE INICIO DE SEMANA, 
            // FECHA DE FIN DE SEMANA, MES

            const id_alumno = escapeSql(values[0]);
            const nombre_alumno = escapeSql(values[1]);
            const numero_telefono = escapeSql(values[2]);
            const correo_electronico = escapeSql(values[3]);
            const turno = escapeSql(values[4]);

            const lunes = processAttendance(values[5]);
            const tiempo_lunes = processTime(values[6]);
            const martes = processAttendance(values[7]);
            const tiempo_martes = processTime(values[8]);
            const miercoles = processAttendance(values[9]);
            const tiempo_miercoles = processTime(values[10]);
            const jueves = processAttendance(values[11]);
            const tiempo_jueves = processTime(values[12]);
            const viernes = processAttendance(values[13]);
            const tiempo_viernes = processTime(values[14]);

            const fecha_inicio_semana = parseDate(values[15]);
            const fecha_fin_semana = parseDate(values[16]);
            const mes = escapeSql(values[17]);

            // Generar INSERT
            const insert = `INSERT INTO soporte.historico_asistencia_en_linea 
  (id_alumno, nombre_alumno, numero_telefono, correo_electronico, turno,
   lunes, tiempo_lunes, martes, tiempo_martes, miercoles, tiempo_miercoles,
   jueves, tiempo_jueves, viernes, tiempo_viernes,
   fecha_inicio_semana, fecha_fin_semana, mes)
VALUES 
  (${id_alumno}, ${nombre_alumno}, ${numero_telefono}, ${correo_electronico}, ${turno},
   ${lunes}, ${tiempo_lunes}, ${martes}, ${tiempo_martes}, ${miercoles}, ${tiempo_miercoles},
   ${jueves}, ${tiempo_jueves}, ${viernes}, ${tiempo_viernes},
   ${fecha_inicio_semana}, ${fecha_fin_semana}, ${mes});

`;

            sqlOutput += insert;
            insertCount++;

        } catch (error) {
            console.error(`Error en línea ${i + 1}: ${error.message}`);
            errorCount++;
        }
    }

    // Escribir archivo de salida
    fs.writeFileSync(outputFile, sqlOutput);

    console.log('\n=================================');
    console.log('Resumen de la generación:');
    console.log('=================================');
    console.log(`✓ Registros procesados: ${insertCount}`);
    console.log(`✗ Errores: ${errorCount}`);
    console.log(`\nArchivo generado: ${outputFile}`);
    console.log('\nPasos siguientes:');
    console.log('1. Ejecuta primero: create_historico_asistencia_en_linea.sql');
    console.log('2. Luego ejecuta: insert_historico_asistencia.sql');
}

main();
