// Script de Importación de Datos a Supabase
// Lee archivos CSV y los importa a las tablas de asistencias y evaluaciones

// Configurar para evitar problemas de SSL en algunas redes
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

// Configuración de Supabase
const SUPABASE_URL = 'https://kyuorwwbusybctvgfhfv.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt5dW9yd3didXN5YmN0dmdmaGZ2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3NzI2NTUsImV4cCI6MjA0OTM0ODY1NX0.sb_publishable_CYwLgYWWzvnDp940Z_mIkw_q35Pakys';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Colores para la consola
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

// Función para leer y parsear CSV
function leerCSV(rutaArchivo) {
    try {
        const contenido = fs.readFileSync(rutaArchivo, 'utf-8');
        const registros = parse(contenido, {
            columns: true,
            skip_empty_lines: true,
            trim: true
        });
        return registros;
    } catch (error) {
        console.error(`${colors.red}❌ Error al leer ${rutaArchivo}:${colors.reset}`, error.message);
        return null;
    }
}

// Función para validar y transformar datos de asistencias
function transformarAsistencia(registro) {
    return {
        nombre_alumno: registro['NOMBRE DEL ALUMNO'] || registro.nombre_alumno,
        numero: registro['NUMERO'] || registro.numero,
        correo_electronico: registro['CORREO ELECTRONICO'] || registro.correo_electronico || null,
        turno: registro['TURNO'] || registro.turno,
        lunes: registro['LUNES'] || registro.lunes,
        martes: registro['MARTES'] || registro.martes,
        miercoles: registro['MIERCOLES'] || registro.miercoles,
        jueves: registro['JUEVES'] || registro.jueves,
        viernes: registro['VIERNES'] || registro.viernes,
        fecha_inicio_semana: convertirFecha(registro['FECHA DE INICIO DE SEMANA'] || registro.fecha_inicio_semana),
        fecha_fin_semana: convertirFecha(registro['FECHA DE FIN DE SEMANA'] || registro.fecha_fin_semana),
        mes: registro['MES'] || registro.mes
    };
}

// Función para validar y transformar datos de evaluaciones
function transformarEvaluacion(registro) {
    return {
        id: parseInt(registro['ID'] || registro.id),
        nombres: registro['NOMBRES'] || registro.nombres,
        turno: registro['TURNO'] || registro.turno,
        modalidad: registro['MODALIDAD'] || registro.modalidad || null,
        realizo_examen: registro['REALIZO EXAMEN'] || registro.realizo_examen || null,
        calificacion: registro['CALIFICACION'] ? parseFloat(registro['CALIFICACION'].toString().replace(',', '.')) : null,
        fecha_evaluacion: convertirFecha(registro['FECHA EVALUACION'] || registro.fecha_evaluacion),
        fecha_inicio: convertirFecha(registro['fecha de inicio'] || registro.fecha_inicio),
        fecha_final: convertirFecha(registro['fecha final'] || registro.fecha_final),
        estado: registro['ESTADO'] || registro.estado || null
    };
}

// Función para convertir fechas de DD/MM/YYYY a YYYY-MM-DD
function convertirFecha(fecha) {
    if (!fecha) return null;

    // Si ya está en formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
        return fecha;
    }

    // Si está en formato DD/MM/YYYY
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(fecha)) {
        const [dia, mes, año] = fecha.split('/');
        return `${año}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
    }

    return null;
}

// Función para importar asistencias en lotes
async function importarAsistencias(rutaCSV) {
    console.log(`\n${colors.cyan}📊 Importando asistencias...${colors.reset}`);

    const registros = leerCSV(rutaCSV);
    if (!registros) return;

    console.log(`${colors.blue}📝 Total de registros a importar: ${registros.length}${colors.reset}`);

    const BATCH_SIZE = 50; // Importar de 50 en 50
    let importados = 0;
    let errores = 0;

    for (let i = 0; i < registros.length; i += BATCH_SIZE) {
        const lote = registros.slice(i, i + BATCH_SIZE);
        const datosTransformados = lote.map(transformarAsistencia);

        try {
            const { data, error } = await supabase
                .from('asistencias')
                .insert(datosTransformados);

            if (error) throw error;

            importados += lote.length;
            console.log(`${colors.green}✅ Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${lote.length} registros importados${colors.reset}`);
        } catch (error) {
            errores += lote.length;
            console.error(`${colors.red}❌ Error en lote ${Math.floor(i / BATCH_SIZE) + 1}:${colors.reset}`, error.message);
        }

        // Pequeña pausa para no saturar la API
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n${colors.cyan}📊 Resumen de Asistencias:${colors.reset}`);
    console.log(`${colors.green}✅ Importados: ${importados}${colors.reset}`);
    console.log(`${colors.red}❌ Errores: ${errores}${colors.reset}`);
}

// Función para importar evaluaciones en lotes
async function importarEvaluaciones(rutaCSV) {
    console.log(`\n${colors.cyan}📊 Importando evaluaciones...${colors.reset}`);

    const registros = leerCSV(rutaCSV);
    if (!registros) return;

    console.log(`${colors.blue}📝 Total de registros a importar: ${registros.length}${colors.reset}`);

    const BATCH_SIZE = 50;
    let importados = 0;
    let errores = 0;

    for (let i = 0; i < registros.length; i += BATCH_SIZE) {
        const lote = registros.slice(i, i + BATCH_SIZE);
        const datosTransformados = lote.map(transformarEvaluacion);

        try {
            const { data, error } = await supabase
                .from('evaluaciones')
                .insert(datosTransformados);

            if (error) throw error;

            importados += lote.length;
            console.log(`${colors.green}✅ Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${lote.length} registros importados${colors.reset}`);
        } catch (error) {
            errores += lote.length;
            console.error(`${colors.red}❌ Error en lote ${Math.floor(i / BATCH_SIZE) + 1}:${colors.reset}`, error.message);
        }

        await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n${colors.cyan}📊 Resumen de Evaluaciones:${colors.reset}`);
    console.log(`${colors.green}✅ Importados: ${importados}${colors.reset}`);
    console.log(`${colors.red}❌ Errores: ${errores}${colors.reset}`);
}

// Función principal
async function main() {
    console.log(`${colors.cyan}╔════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.cyan}║  Importador de Datos a Supabase       ║${colors.reset}`);
    console.log(`${colors.cyan}╚════════════════════════════════════════╝${colors.reset}\n`);

    // Verificar que existan los archivos CSV
    const rutaAsistencias = './migration/asistenciasMAT.csv';
    const rutaEvaluaciones = './migration/evaluacionesMAT.csv';

    if (!fs.existsSync(rutaAsistencias)) {
        console.error(`${colors.red}❌ No se encontró el archivo: ${rutaAsistencias}${colors.reset}`);
        console.log(`${colors.yellow}💡 Coloca tu archivo CSV de asistencias en: migration/asistenciasMAT.csv${colors.reset}`);
        return;
    }

    if (!fs.existsSync(rutaEvaluaciones)) {
        console.error(`${colors.red}❌ No se encontró el archivo: ${rutaEvaluaciones}${colors.reset}`);
        console.log(`${colors.yellow}💡 Coloca tu archivo CSV de evaluaciones en: migration/evaluacionesMAT.csv${colors.reset}`);
        return;
    }

    // Importar datos
    await importarAsistencias(rutaAsistencias);
    await importarEvaluaciones(rutaEvaluaciones);

    console.log(`\n${colors.green}✨ Importación completada!${colors.reset}\n`);
}

// Ejecutar
main().catch(error => {
    console.error(`${colors.red}❌ Error fatal:${colors.reset}`, error);
    process.exit(1);
});
