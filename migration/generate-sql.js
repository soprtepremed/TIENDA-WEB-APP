// Script para generar SQL INSERT desde CSV
// Genera archivos SQL que puedes ejecutar directamente en Supabase

import fs from 'fs';
import { parse } from 'csv-parse/sync';

// Función para leer CSV
function leerCSV(rutaArchivo) {
    const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
    return parse(contenido, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    });
}

// Función para escapar strings SQL
function escaparSQL(valor) {
    if (valor === null || valor === undefined || valor === '') return 'NULL';
    return `'${valor.toString().replace(/'/g, "''")}'`;
}

// Función para convertir fechas
function convertirFecha(fecha) {
    if (!fecha) return null;

    // Si ya está en formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return fecha;
    }

    // Si está en formato DD/MM/YYYY o DD/MM/YY
    const match = fecha.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (match) {
        let [_, dia, mes, año] = match;

        // Convertir año de 2 dígitos a 4 dígitos
        if (año.length === 2) {
            año = parseInt(año) < 50 ? `20${año}` : `19${año}`;
        }

        return `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }

    return null;
}

// Función para validar y transformar datos de asistencias
function transformarAsistencia(registro) {
    // Limpiar nombres de columnas (quitar espacios extra)
    const cleanReg = {};
    for (const key in registro) {
        cleanReg[key.trim()] = registro[key];
    }

    return {
        id_alumno: cleanReg['ID'] || cleanReg.id_alumno || null,
        nombre_alumno: cleanReg['NOMBRE DEL ALUMNO'] || cleanReg.nombre_alumno,
        numero: cleanReg['NUMERO'] || cleanReg.numero,
        correo_electronico: cleanReg['CORREO ELECTRONICO'] || cleanReg.correo_electronico || null,
        turno: cleanReg['TURNO'] || cleanReg.turno,
        lunes: cleanReg['LUNES'] || cleanReg.lunes,
        martes: cleanReg['MARTES'] || cleanReg.martes,
        miercoles: cleanReg['MIERCOLES'] || cleanReg.miercoles,
        jueves: cleanReg['JUEVES'] || cleanReg.jueves,
        viernes: cleanReg['VIERNES'] || cleanReg.viernes,
        fecha_inicio_semana: convertirFecha(cleanReg['FECHA DE INICIO DE SEMANA'] || cleanReg.fecha_inicio_semana),
        fecha_fin_semana: convertirFecha(cleanReg['FECHA DE FIN DE SEMANA'] || cleanReg.fecha_fin_semana),
        mes: cleanReg['MES'] || cleanReg.mes
    };
}

// Generar SQL para asistencias
function generarSQLAsistencias() {
    console.log('📊 Generando SQL para asistencias...');

    const registros = leerCSV('./migration/asistenciasMAT.csv');
    let sql = '-- SQL para importar asistencias\n';
    sql += '-- Copia y pega este código en el SQL Editor de Supabase\n\n';

    registros.forEach((reg, index) => {
        const datosAsistencia = transformarAsistencia(reg);

        sql += `INSERT INTO asistencias (id_alumno, nombre_alumno, numero, correo_electronico, turno, lunes, martes, miercoles, jueves, viernes, fecha_inicio_semana, fecha_fin_semana, mes) VALUES (\n`;
        sql += `  ${escaparSQL(datosAsistencia.id_alumno)}, ${escaparSQL(datosAsistencia.nombre_alumno)}, ${escaparSQL(datosAsistencia.numero)}, ${escaparSQL(datosAsistencia.correo_electronico)}, ${escaparSQL(datosAsistencia.turno)},\n`;
        sql += `  ${escaparSQL(datosAsistencia.lunes)}, ${escaparSQL(datosAsistencia.martes)}, ${escaparSQL(datosAsistencia.miercoles)}, ${escaparSQL(datosAsistencia.jueves)}, ${escaparSQL(datosAsistencia.viernes)},\n`;
        sql += `  ${escaparSQL(datosAsistencia.fecha_inicio_semana)}, ${escaparSQL(datosAsistencia.fecha_fin_semana)}, ${escaparSQL(datosAsistencia.mes)}\n`;
        sql += `);\n\n`;

        if ((index + 1) % 20 === 0) {
            console.log(`  ✅ Generados ${index + 1} de ${registros.length} registros`);
        }
    });

    fs.writeFileSync('./migration/insert_asistencias.sql', sql);
    console.log(`✅ SQL generado: migration/insert_asistencias.sql (${registros.length} registros)\n`);
}

// Generar SQL para evaluaciones
function generarSQLEvaluaciones() {
    console.log('📊 Generando SQL para evaluaciones...');

    const registros = leerCSV('./migration/evaluacionesMAT.csv');
    let sql = '-- SQL para importar evaluaciones\n';
    sql += '-- Copia y pega este código en el SQL Editor de Supabase\n\n';

    registros.forEach((reg, index) => {
        const id = reg['ID'] || reg.id;
        const nombres = reg['NOMBRES'] || reg.nombres;
        const turno = reg['TURNO'] || reg.turno;
        const modalidad = reg['MODALIDAD'] || reg.modalidad || null;
        const realizoExamen = reg['REALIZO EXAMEN'] || reg.realizo_examen || null;
        const calificacion = reg['CALIFICACION'] ? parseFloat(reg['CALIFICACION'].toString().replace(',', '.')) : null;
        const fechaEval = convertirFecha(reg['FECHA EVALUACION'] || reg.fecha_evaluacion);
        const fechaInicio = convertirFecha(reg['fecha de inicio'] || reg.fecha_inicio);
        const fechaFinal = convertirFecha(reg['fecha final'] || reg.fecha_final);
        const estado = reg['ESTADO'] || reg.estado || null;

        sql += `INSERT INTO evaluaciones (id, nombres, turno, modalidad, realizo_examen, calificacion, fecha_evaluacion, fecha_inicio, fecha_final, estado) VALUES (\n`;
        sql += `  ${id}, ${escaparSQL(nombres)}, ${escaparSQL(turno)}, ${escaparSQL(modalidad)},\n`;
        sql += `  ${escaparSQL(realizoExamen)}, ${calificacion !== null ? calificacion : 'NULL'}, ${escaparSQL(fechaEval)},\n`;
        sql += `  ${escaparSQL(fechaInicio)}, ${escaparSQL(fechaFinal)}, ${escaparSQL(estado)}\n`;
        sql += `);\n\n`;

        if ((index + 1) % 20 === 0) {
            console.log(`  ✅ Generados ${index + 1} de ${registros.length} registros`);
        }
    });

    fs.writeFileSync('./migration/insert_evaluaciones.sql', sql);
    console.log(`✅ SQL generado: migration/insert_evaluaciones.sql (${registros.length} registros)\n`);
}

// Ejecutar
console.log('╔════════════════════════════════════════╗');
console.log('║  Generador de SQL desde CSV           ║');
console.log('╚════════════════════════════════════════╝\n');

try {
    generarSQLAsistencias();
    generarSQLEvaluaciones();

    console.log('✨ Archivos SQL generados exitosamente!');
    console.log('\n📝 Próximos pasos:');
    console.log('1. Abre Supabase SQL Editor');
    console.log('2. Copia el contenido de migration/insert_asistencias.sql');
    console.log('3. Pégalo y ejecuta (RUN)');
    console.log('4. Repite con migration/insert_evaluaciones.sql\n');
} catch (error) {
    console.error('❌ Error:', error.message);
}
