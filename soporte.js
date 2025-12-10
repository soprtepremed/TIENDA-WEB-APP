// Módulo de Soporte - Buscador de Alumnos
// Lógica principal de la interfaz

// Estado de la aplicación
let alumnoActual = null;
let tabActiva = 'asistencias';

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando módulo de soporte...');

    // Inicializar Supabase
    if (!window.initSupabase()) {
        console.error('No se pudo inicializar Supabase');
    }

    // Probar conexión a Supabase
    const conexionExitosa = await window.testConnection();
    if (!conexionExitosa) {
        mostrarError('No se pudo conectar a la base de datos. Verifica tu configuración.');
        return;
    }

    // Event listeners
    document.getElementById('btnBuscar').addEventListener('click', realizarBusqueda);
    document.getElementById('inputBusqueda').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            realizarBusqueda();
        }
    });

    // Tabs
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.addEventListener('click', (e) => cambiarTab(e.target.dataset.tab));
    });
});

// Función para realizar la búsqueda
async function realizarBusqueda() {
    const inputBusqueda = document.getElementById('inputBusqueda');
    const id = inputBusqueda.value.trim();

    if (!id) {
        mostrarError('Por favor ingresa un ID o número de alumno');
        return;
    }

    mostrarCargando(true);
    ocultarResultados();

    try {
        const resultado = await window.obtenerEstadisticasAlumno(id);

        if (!resultado || !resultado.encontrado) {
            mostrarError('No se encontró ningún alumno con ese ID');
            mostrarCargando(false);
            return;
        }

        alumnoActual = resultado;
        mostrarResultados(resultado);
        mostrarCargando(false);

    } catch (error) {
        console.error('Error en búsqueda:', error);
        mostrarError('Ocurrió un error al buscar el alumno');
        mostrarCargando(false);
    }
}

// Función para mostrar los resultados
function mostrarResultados(datos) {
    const contenedorResultados = document.getElementById('resultados');
    contenedorResultados.classList.remove('hidden');

    // Mostrar información del alumno
    document.getElementById('nombreAlumno').textContent = datos.alumno.nombre;
    document.getElementById('numeroAlumno').textContent = datos.alumno.numero;
    document.getElementById('correoAlumno').textContent = datos.alumno.correo || 'No disponible';
    document.getElementById('turnoAlumno').textContent = datos.alumno.turno;

    // Mostrar estadísticas
    if (datos.estadisticas) {
        document.getElementById('porcentajeAsistencia').textContent = `${datos.estadisticas.porcentajeAsistencia}%`;
        document.getElementById('promedioCalificaciones').textContent = datos.estadisticas.promedioCalificaciones;
        document.getElementById('totalSemanas').textContent = datos.totalAsistencias;
        document.getElementById('totalEvaluaciones').textContent = datos.totalEvaluaciones;
    }

    // Mostrar la tab activa
    cambiarTab(tabActiva);
}

// Función para cambiar de tab
function cambiarTab(tab) {
    tabActiva = tab;

    // Actualizar botones de tabs
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.tab === tab) {
            btn.classList.add('active');
        }
    });

    // Mostrar contenido correspondiente
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.add('hidden');
    });

    if (tab === 'asistencias') {
        document.getElementById('tabAsistencias').classList.remove('hidden');
        renderizarAsistencias();
    } else if (tab === 'evaluaciones') {
        document.getElementById('tabEvaluaciones').classList.remove('hidden');
        renderizarEvaluaciones();
    }
}

// Función para renderizar asistencias
function renderizarAsistencias() {
    if (!alumnoActual || !alumnoActual.asistencias) return;

    const contenedor = document.getElementById('listaAsistencias');
    contenedor.innerHTML = '';

    if (alumnoActual.asistencias.length === 0) {
        contenedor.innerHTML = '<p class="text-secondary">No hay registros de asistencia</p>';
        return;
    }

    alumnoActual.asistencias.forEach(semana => {
        const semanaCard = crearCardSemana(semana);
        contenedor.appendChild(semanaCard);
    });
}

// Función para crear card de semana
function crearCardSemana(semana) {
    const card = document.createElement('div');
    card.className = 'semana-card';

    const fechaInicio = new Date(semana.fecha_inicio_semana).toLocaleDateString('es-MX');
    const fechaFin = new Date(semana.fecha_fin_semana).toLocaleDateString('es-MX');

    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
    const diasHTML = dias.map(dia => {
        const asistio = semana[dia] === 'ASISTIÓ';
        const clase = asistio ? 'asistencia-si' : 'asistencia-no';
        const icono = asistio ? '✓' : '✗';
        return `
            <div class="dia-asistencia ${clase}">
                <div class="dia-nombre">${dia.charAt(0).toUpperCase()}</div>
                <div class="dia-icono">${icono}</div>
            </div>
        `;
    }).join('');

    card.innerHTML = `
        <div class="semana-header">
            <span class="semana-fecha">${fechaInicio} - ${fechaFin}</span>
            <span class="semana-mes">${semana.mes}</span>
        </div>
        <div class="dias-grid">
            ${diasHTML}
        </div>
    `;

    return card;
}

// Función para renderizar evaluaciones
function renderizarEvaluaciones() {
    if (!alumnoActual || !alumnoActual.evaluaciones) return;

    const contenedor = document.getElementById('listaEvaluaciones');
    contenedor.innerHTML = '';

    if (alumnoActual.evaluaciones.length === 0) {
        contenedor.innerHTML = '<p class="text-secondary">No hay registros de evaluaciones</p>';
        return;
    }

    const tabla = document.createElement('table');
    tabla.className = 'tabla-evaluaciones';
    tabla.innerHTML = `
        <thead>
            <tr>
                <th>Fecha</th>
                <th>Modalidad</th>
                <th>Realizó</th>
                <th>Calificación</th>
                <th>Estado</th>
            </tr>
        </thead>
        <tbody>
            ${alumnoActual.evaluaciones.map(ev => `
                <tr>
                    <td>${ev.fecha_evaluacion ? new Date(ev.fecha_evaluacion).toLocaleDateString('es-MX') : 'N/A'}</td>
                    <td>${ev.modalidad || 'N/A'}</td>
                    <td>${ev.realizo_examen || 'N/A'}</td>
                    <td class="calificacion">${ev.calificacion !== null ? ev.calificacion + '%' : '--'}</td>
                    <td><span class="badge-estado">${ev.estado || 'N/A'}</span></td>
                </tr>
            `).join('')}
        </tbody>
    `;

    contenedor.appendChild(tabla);
}

// Funciones de utilidad
function mostrarCargando(mostrar) {
    const loader = document.getElementById('loader');
    if (loader) {
        if (mostrar) {
            loader.classList.remove('hidden');
        } else {
            loader.classList.add('hidden');
        }
    }
}

function ocultarResultados() {
    const resultados = document.getElementById('resultados');
    const mensajeError = document.getElementById('mensajeError');
    if (resultados) resultados.classList.add('hidden');
    if (mensajeError) mensajeError.classList.add('hidden');
}

function mostrarError(mensaje) {
    const mensajeError = document.getElementById('mensajeError');
    if (mensajeError) {
        mensajeError.textContent = mensaje;
        mensajeError.classList.remove('hidden');
    }
}
