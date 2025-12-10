// Configuración de Supabase para el Módulo de Soporte
// Conecta al VPS con esquema 'soporte'

// Crear cliente de Supabase con el esquema 'soporte'
const SUPABASE_URL = 'https://api.premed.mx';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

let supabase;

// Inicializar cuando se cargue la librería
function initSupabase() {
    if (window.supabase) {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            db: { schema: 'soporte' }
        });
        console.log('✅ Supabase inicializado');
        return true;
    }
    return false;
}

// Función para verificar la conexión
async function testConnection() {
    try {
        if (!supabase) initSupabase();

        const { data, error } = await supabase
            .from('asistencias')
            .select('id')
            .limit(1);

        if (error) throw error;
        console.log('✅ Conexión a Supabase VPS exitosa');
        return true;
    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
        return false;
    }
}

// Función para buscar alumno por ID, número o id_alumno (matrícula)
async function buscarAlumnoPorId(id) {
    try {
        if (!supabase) initSupabase();

        // Buscar en asistencias por numero o id_alumno
        const { data: asistencias, error: errorAsistencias } = await supabase
            .from('asistencias')
            .select('*')
            .or(`numero.eq.${id},id_alumno.eq.${id}`)
            .order('fecha_inicio_semana', { ascending: false });

        if (errorAsistencias) throw errorAsistencias;

        // Buscar en evaluaciones por id
        const { data: evaluaciones, error: errorEvaluaciones } = await supabase
            .from('evaluaciones')
            .select('*')
            .eq('id', id)
            .order('fecha_evaluacion', { ascending: false });

        if (errorEvaluaciones) throw errorEvaluaciones;

        // Si no se encontró nada
        if ((!asistencias || asistencias.length === 0) && (!evaluaciones || evaluaciones.length === 0)) {
            return {
                encontrado: false,
                mensaje: 'No se encontró ningún alumno con ese ID'
            };
        }

        // Obtener información básica del alumno
        const alumnoInfo = asistencias && asistencias.length > 0
            ? {
                id_alumno: asistencias[0].id_alumno,
                nombre: asistencias[0].nombre_alumno,
                numero: asistencias[0].numero,
                correo: asistencias[0].correo_electronico,
                turno: asistencias[0].turno
            }
            : {
                id_alumno: evaluaciones[0].id,
                nombre: evaluaciones[0].nombres,
                numero: id,
                turno: evaluaciones[0].turno
            };

        return {
            encontrado: true,
            alumno: alumnoInfo,
            asistencias: asistencias || [],
            evaluaciones: evaluaciones || [],
            totalAsistencias: asistencias ? asistencias.length : 0,
            totalEvaluaciones: evaluaciones ? evaluaciones.length : 0
        };

    } catch (error) {
        console.error('Error al buscar alumno:', error);
        return {
            encontrado: false,
            error: error.message
        };
    }
}

// Función para obtener estadísticas del alumno
async function obtenerEstadisticasAlumno(id) {
    try {
        const resultado = await buscarAlumnoPorId(id);

        if (!resultado.encontrado) {
            return null;
        }

        // Calcular estadísticas de asistencia
        let totalDias = 0;
        let diasAsistidos = 0;

        resultado.asistencias.forEach(semana => {
            ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'].forEach(dia => {
                if (semana[dia]) {
                    totalDias++;
                    if (semana[dia] === 'ASISTIÓ') {
                        diasAsistidos++;
                    }
                }
            });
        });

        const porcentajeAsistencia = totalDias > 0 ? (diasAsistidos / totalDias * 100).toFixed(1) : 0;

        // Calcular promedio de calificaciones (ahora son porcentajes)
        const evaluacionesConCalif = resultado.evaluaciones.filter(e => e.calificacion !== null);
        const promedioCalificaciones = evaluacionesConCalif.length > 0
            ? (evaluacionesConCalif.reduce((sum, e) => sum + parseFloat(e.calificacion), 0) / evaluacionesConCalif.length).toFixed(1)
            : 'N/A';

        return {
            ...resultado,
            estadisticas: {
                totalDias,
                diasAsistidos,
                diasFaltados: totalDias - diasAsistidos,
                porcentajeAsistencia,
                promedioCalificaciones,
                evaluacionesRealizadas: resultado.evaluaciones.filter(e => e.realizo_examen === 'SI').length,
                evaluacionesPendientes: resultado.evaluaciones.filter(e => e.realizo_examen === 'NO').length
            }
        };

    } catch (error) {
        console.error('Error al obtener estadísticas:', error);
        return null;
    }
}

// Exponer funciones globalmente
window.testConnection = testConnection;
window.buscarAlumnoPorId = buscarAlumnoPorId;
window.obtenerEstadisticasAlumno = obtenerEstadisticasAlumno;
window.initSupabase = initSupabase;
