// ===================================
// Módulo de Asistencia - JavaScript
// ===================================

// Configuración de Supabase
const ASISTENCIA_SUPABASE_URL = 'https://api.premed.mx';
const ASISTENCIA_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwpHkJIv1aR5AXv2Jpwq2Kb7-FyhNXIvZ4yq-BMmzoqs3rdFeFkwrQL0rjAm2TtHDFSLA/exec';

// Variables globales
let asistenciaSupabase;
let premedSupabase; // Cliente para el esquema 'premed'
let turnoSeleccionado = 'matutino';
let configuracion = { nombre_sesion: 'Clase General', script_url: DEFAULT_SCRIPT_URL };
let correosAutorizados = { matutino: [], vespertino: [] };
let registrosHoy = []; // Almacena los registros cargados (del día seleccionado)
// Inicializar con fecha local (YYYY-MM-DD)
const ahoraIni = new Date();
const yearIni = ahoraIni.getFullYear();
const monthIni = String(ahoraIni.getMonth() + 1).padStart(2, '0');
const dayIni = String(ahoraIni.getDate()).padStart(2, '0');
let fechaSeleccionada = `${yearIni}-${monthIni}-${dayIni}`;

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📋 Inicializando módulo de Asistencia...');
    initAsistenciaSupabase();

    // Set default date
    const fechaInput = document.getElementById('filtroFecha');
    if (fechaInput) {
        fechaInput.value = fechaSeleccionada;
    }

    // Helper para timeout
    const timeoutPromise = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout de conexión')), ms));

    try {
        // Intentar cargar configuración con timeout de 5s
        await Promise.race([
            cargarConfiguracion(),
            timeoutPromise(5000)
        ]);
    } catch (error) {
        console.warn('⚠️ No se pudo cargar la configuración a tiempo (posible error de red). Usando valores por defecto.');
        // Forzar actualización de UI para quitar "Cargando..."
        const nombreSesionElem = document.getElementById('nombreSesion');
        if (nombreSesionElem) nombreSesionElem.textContent = configuracion.nombre_sesion;
        mostrarMensaje('warning', '⚠️ Modo sin conexión: Algunas funciones pueden ser limitadas.');
    }

    try {
        await Promise.race([cargarCorreosAutorizados(), timeoutPromise(5000)]);
    } catch (e) { console.warn('Error cargando alumnos:', e); }

    try {
        await cargarRegistros();
        await cargarEstadisticas();
        suscribirCambios(); // Iniciar Realtime
    } catch (e) { console.error('Error en carga inicial de datos:', e); }

    console.log('✅ Módulo de Asistencia listo (o en modo fallback)');

    // Inicializar enlace de alumno
    const linkAlumnoInput = document.getElementById('linkAlumno');
    if (linkAlumnoInput) {
        // Generar enlace basado en la URL actual, reemplazando asistencia.html por registro.html
        // O si estamos en root, adjuntar registro.html
        const currentUrl = window.location.href;
        const registroUrl = currentUrl.includes('asistencia.html')
            ? currentUrl.replace('asistencia.html', 'registro.html')
            : currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1) + 'registro.html';

        linkAlumnoInput.value = registroUrl;
    }
});

// Inicializar cliente Supabase con Reintentos (Blindaje 1)
function initAsistenciaSupabase() {
    if (asistenciaSupabase && premedSupabase) return asistenciaSupabase;

    if (window.supabase) {
        try {
            // Cliente para registros (Esquema: soporte)
            if (!asistenciaSupabase) {
                asistenciaSupabase = window.supabase.createClient(ASISTENCIA_SUPABASE_URL, ASISTENCIA_SUPABASE_ANON_KEY, {
                    db: { schema: 'soporte' },
                    auth: { persistSession: true, autoRefreshToken: true }
                });
                console.log('✅ Supabase conectado (esquema: soporte)');
            }

            // Cliente para alumnos (Esquema: premed)
            if (!premedSupabase) {
                premedSupabase = window.supabase.createClient(ASISTENCIA_SUPABASE_URL, ASISTENCIA_SUPABASE_ANON_KEY, {
                    db: { schema: 'premed' },
                    auth: { persistSession: true, autoRefreshToken: true }
                });
                console.log('✅ Supabase conectado (esquema: premed)');
            }
            return asistenciaSupabase;
        } catch (e) {
            console.error("🔥 Error crítico iniciando Supabase:", e);
            mostrarMensaje('error', 'Error interno iniciando base de datos.');
            return null;
        }
    } else {
        console.warn("⏳ Librería Supabase aún no carga, reintentando...");
        return null;
    }
}

// ===================================
// REALTIME SUBSCRIPTION
// ===================================
function suscribirCambios() {
    if (!asistenciaSupabase) return;

    asistenciaSupabase
        .channel('tabla_registros')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'registros' },
            (payload) => {
                console.log('🔄 Cambio detectado en tiempo real:', payload);

                // Manejar INSERT (Nuevo registro)
                if (payload.eventType === 'INSERT') {
                    const nuevoRegistro = payload.new;
                    // Solo agregar si pertenece a la fecha que estamos viendo
                    if (nuevoRegistro.fecha === fechaSeleccionada) {
                        registrosHoy.unshift(nuevoRegistro);
                        // Reordenar por timestamp descendente para asegurar "más reciente arriba"
                        registrosHoy.sort((a, b) => {
                            // Orden descendente (B - A)
                            return (b.timestamp || '').localeCompare(a.timestamp || '');
                        });

                        filtrarLista(); // Actualiza la tabla visual
                        cargarEstadisticas(); // Actualiza contadores

                        // Notificación visual temporal
                        mostrarNotificacionRealtime(`Nuevo registro: ${nuevoRegistro.email}`);
                    }
                }

                // Manejar DELETE (Eliminar registro)
                if (payload.eventType === 'DELETE') {
                    const idEliminado = payload.old.id;
                    const longitudAnterior = registrosHoy.length;
                    registrosHoy = registrosHoy.filter(r => r.id !== idEliminado);

                    if (registrosHoy.length !== longitudAnterior) {
                        filtrarLista();
                        cargarEstadisticas();
                    }
                }
            }
        )
        .subscribe();
    console.log('📡 Escuchando cambios en tiempo real...');
}

function mostrarNotificacionRealtime(texto) {
    const notif = document.createElement('div');
    notif.style.position = 'fixed';
    notif.style.bottom = '20px';
    notif.style.right = '20px';
    notif.style.backgroundColor = '#1B3A6B';
    notif.style.color = 'white';
    notif.style.padding = '12px 24px';
    notif.style.borderRadius = '8px';
    notif.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    notif.style.zIndex = '10000';
    notif.style.fontFamily = 'var(--font-family)';
    notif.style.animation = 'fadeIn 0.3s ease-out';
    notif.textContent = texto;
    document.body.appendChild(notif);

    setTimeout(() => {
        notif.style.opacity = '0';
        notif.style.transition = 'opacity 0.5s';
        setTimeout(() => notif.remove(), 500);
    }, 3000);
}

// ===================================
// NAVEGACIÓN
// ===================================

function cambiarTab(tab) {
    // Expandir contenedor si es Admin
    const container = document.querySelector('.container');
    if (tab === 'admin') {
        container?.classList.add('admin-expanded');
    } else {
        container?.classList.remove('admin-expanded');
    }

    // Actualizar botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Actualizar contenido
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    const targetTab = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (targetTab) targetTab.classList.add('active');
}

function cambiarSubtab(subtab) {
    // Actualizar botones
    document.querySelectorAll('.subtab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.subtab === subtab);
    });

    // Actualizar contenido
    document.querySelectorAll('.subtab-content').forEach(content => {
        content.classList.remove('active');
    });
    const targetSubtab = document.getElementById(`subtab${subtab.charAt(0).toUpperCase() + subtab.slice(1)}`);
    if (targetSubtab) targetSubtab.classList.add('active');
}

// ===================================
// REGISTRO DE ASISTENCIA
// ===================================

function seleccionarTurno(turno) {
    turnoSeleccionado = turno;
    document.querySelectorAll('.turno-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.turno === turno);
    });
}

// BLINDAJE 2: Marcar Asistencia Robusto
async function marcarAsistencia() {
    const inputCorreo = document.getElementById('inputCorreo');
    const btnMarcar = document.getElementById('btnMarcarAsistencia');

    // Validación Defensiva de Elementos
    if (!inputCorreo || !btnMarcar) {
        console.error("❌ Error DOM: No se encuentran los inputs de registro.");
        return;
    }

    const email = inputCorreo.value.toLowerCase().trim();

    // Validar formato correo
    if (!email || !email.includes('@') || email.length < 5) {
        mostrarMensaje('error', '❌ Por favor ingresa un correo válido.');
        return;
    }

    // Verificar si está autorizado (Seguridad)
    // Usamos ?. para evitar crash si correosAutorizados es null
    const enMatutino = correosAutorizados?.matutino?.includes(email);
    const enVespertino = correosAutorizados?.vespertino?.includes(email);

    if (!enMatutino && !enVespertino) {
        mostrarMensaje('error', '⚠️ Correo no encontrado en la lista de alumnos activos.');
        return;
    }

    // Determinar turno
    let turnoAsignado = turnoSeleccionado;
    if (enMatutino && !enVespertino) turnoAsignado = 'matutino';
    if (!enMatutino && enVespertino) turnoAsignado = 'vespertino';

    // UI Feedback inmediato
    btnMarcar.disabled = true;
    const textoOriginal = btnMarcar.textContent;
    btnMarcar.textContent = 'Registrando...';

    try {
        // Asegurar cliente
        const client = initAsistenciaSupabase();
        if (!client) throw new Error("No hay conexión con la base de datos.");

        // Datos fecha/hora sync
        const ahora = new Date();
        // Usar formato ISO local para evitar problemas de zona horaria
        const pad = (n) => String(n).padStart(2, '0');
        const hoy = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;
        const timestampLocal = `${hoy}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(ahora.getSeconds())}`;

        // Lógica de Turno Real
        let turnoAsistidoReal = 'otro';
        const h = ahora.getHours();
        if (h >= 7 && h < 14) turnoAsistidoReal = 'matutino'; // Ampliado margen
        else if (h >= 14 && h < 22) turnoAsistidoReal = 'vespertino';

        // INTENTO DE INSERT
        const { error } = await client
            .from('registros')
            .insert({
                email: email,
                turno: turnoAsignado,
                turno_asistido: turnoAsistidoReal,
                fecha: hoy,
                timestamp: timestampLocal
            });

        if (error) throw error; // Lanzar para manejar en catch

        // Éxito real
        // Intentar Google Sheets (No bloqueante)
        enviarAGoogleSheets(email, turnoAsignado, turnoAsistidoReal).catch(err => console.warn("Fallo Sheets:", err));

        mostrarMensaje('success', `✅ Asistencia Correcta (${turnoAsignado.toUpperCase()})`);
        inputCorreo.value = '';

        // Actualizar UI en segundo plano
        cargarRegistros();
        cargarEstadisticas();

    } catch (error) {
        console.error('Error Registro:', error);

        // MANEJO INTELIGENTE DE ERRORES
        if (error.code === '23505' || (error.message && error.message.includes('duplicate key'))) {
            // Ya estaba registrado hoy. Para el usuario esto es "Éxito/Info", no error.
            mostrarMensaje('warning', 'ℹ️ Ya habías registrado tu asistencia hoy. ¡Todo listo!');
            inputCorreo.value = '';
        } else if (error.message && error.message.includes('fetch')) {
            mostrarMensaje('error', '📡 Error de conexión. Verifica tu internet.');
        } else {
            mostrarMensaje('error', '❌ Ocurrió un error. Intenta de nuevo.');
        }
    } finally {
        btnMarcar.disabled = false;
        btnMarcar.textContent = textoOriginal;
    }
}

async function enviarAGoogleSheets(email, turno, turnoAsistidoReal = '') {
    if (!configuracion.script_url) return;

    // Convertir a formato "Matutino" / "Vespertino" (Capitalizado)
    const turnoCapitalizado = turno.charAt(0).toUpperCase() + turno.slice(1).toLowerCase();

    try {
        await fetch(configuracion.script_url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                turno: turnoCapitalizado, // Clave estándar (Turno Oficial)
                Turno: turnoCapitalizado,
                shift: turnoCapitalizado,
                turno_asistido: turnoAsistidoReal, // Nueva clave enviada
                timestamp: new Date().toISOString()
            })
        });
        console.log('📨 Enviado a Google Sheets: ' + turnoCapitalizado);
    } catch (e) {
        console.error('Error enviando a Sheets:', e);
    }
}

function mostrarMensaje(tipo, texto) {
    const mensajeDiv = document.getElementById('mensajeRegistro');
    mensajeDiv.className = `mensaje-registro ${tipo}`;
    mensajeDiv.textContent = texto;
    mensajeDiv.classList.remove('hidden');

    if (tipo === 'success') {
        setTimeout(() => {
            mensajeDiv.classList.add('hidden');
        }, 5000);
    }
}

// ===================================
// CARGAR DATOS
// ===================================

async function cargarConfiguracion() {
    try {
        const { data } = await asistenciaSupabase
            .from('configuracion')
            .select('*')
            .single();

        if (data) {
            configuracion = data;
            if (configuracion.nombre_sesion) {
                const nombreSesionElem = document.getElementById('nombreSesion');
                if (nombreSesionElem) nombreSesionElem.textContent = configuracion.nombre_sesion;
            }

            const configNombreElem = document.getElementById('configNombre');
            const configScriptElem = document.getElementById('configScript');

            if (configNombreElem) configNombreElem.value = data.nombre_sesion || '';
            if (configScriptElem) configScriptElem.value = data.script_url || DEFAULT_SCRIPT_URL;
        }
    } catch (e) {
        console.error('Error cargando config:', e);
    }
}

async function cargarCorreosAutorizados() {
    try {
        console.log('🔄 Cargando alumnos desde PREMED (Central)...');

        // Asegurar inicialización
        initAsistenciaSupabase();

        // Usar cliente PREMED
        if (!premedSupabase) {
            console.error("❌ Cliente Premed no inicializado.");
            return;
        }

        // Consultar alumnos centralizados
        const { data, error } = await premedSupabase
            .from('alumnos')
            .select('*')
            .eq('activo', true); // Solo alumnos activos

        if (error) {
            console.error('Error cargando alumnos PREMED:', error);
            // Fallback visual
            mostrarMensaje('error', 'Error accediendo a base de datos de alumnos.');
            return;
        }

        correosAutorizados = { matutino: [], vespertino: [] };

        // Procesar datos
        const alumnosActivos = data || [];

        alumnosActivos.forEach(item => {
            const email = item.email ? item.email.toLowerCase() : '';
            if (!email) return;

            if (item.turno === 'matutino') {
                correosAutorizados.matutino.push(email);
            } else if (item.turno === 'vespertino') {
                correosAutorizados.vespertino.push(email);
            }
        });

        // Actualizar contadores UI
        const countMatElem = document.getElementById('countMatutino');
        const countVespElem = document.getElementById('countVespertino');
        if (countMatElem) countMatElem.textContent = correosAutorizados.matutino.length;
        if (countVespElem) countVespElem.textContent = correosAutorizados.vespertino.length;

        // Renderizar lista visual
        // Mapeamos para mantener compatibilidad con la función de renderizado
        const alumnosMapeados = alumnosActivos.map(d => ({
            ...d,
            nombre: d.nombre || d.nombre_alumno || 'Alumno',
            // La tabla premed.alumnos SÍ tiene modalidad, la usamos
            modalidad: d.modalidad || 'presencial'
        }));

        renderizarListaAlumnos(alumnosMapeados);

        console.log(`✅ Alumnos cargados desde PREMED: ${alumnosActivos.length}`);

    } catch (e) {
        console.error('Error en carga de alumnos:', e);
    }
}

function renderizarListaAlumnos(alumnos) {
    // Intentar obtener los contenedores separados (Nuevo diseño)
    const containerMat = document.getElementById('listaAlumnosMatutino');
    const containerVesp = document.getElementById('listaAlumnosVespertino');

    // Si existen los contenedores separados (Vista Admin con columnas)
    if (containerMat && containerVesp) {
        // Filtrar alumnos
        const matutinos = alumnos.filter(a => a.turno === 'matutino');
        const vespertinos = alumnos.filter(a => a.turno === 'vespertino');

        // Renderizar Matutinos
        containerMat.innerHTML = matutinos.length ? matutinos.map(a => generarHTMLAlumno(a)).join('') :
            '<div class="empty-state" style="padding: 20px;"><p>Sin alumnos</p></div>';

        // Renderizar Vespertinos
        containerVesp.innerHTML = vespertinos.length ? vespertinos.map(a => generarHTMLAlumno(a)).join('') :
            '<div class="empty-state" style="padding: 20px;"><p>Sin alumnos</p></div>';

        return;
    }

    // Fallback: Contenedor único (si existe, aunque ahora está oculto en el HTML nuevo)
    const container = document.getElementById('listaAlumnos');
    if (!container) return; // Si no existe nada (vista alumno), salir

    if (!alumnos || alumnos.length === 0) {
        container.innerHTML = '<div class="empty-state"><span class="empty-icon">👥</span><p>No hay alumnos registrados</p></div>';
        return;
    }

    container.innerHTML = alumnos.map(a => generarHTMLAlumno(a)).join('');
}

function generarHTMLAlumno(a) {
    // Ya no mostramos botón de eliminar porque es read-only desde asistencia
    return `
        <div class="alumno-item">
            <span class="alumno-email">${a.email}</span>
            <div class="alumno-actions">
                <span class="badge-turno badge-${a.turno}">${a.turno === 'matutino' ? '☀️' : '🌙'} ${a.turno}</span>
            </div>
        </div>
    `;
}

async function cargarRegistros() {
    try {
        const fechaInput = document.getElementById('filtroFecha');

        let fecha;
        if (fechaInput && fechaInput.value) {
            fecha = fechaInput.value;
        } else {
            const ahora = new Date();
            const year = ahora.getFullYear();
            const month = String(ahora.getMonth() + 1).padStart(2, '0');
            const day = String(ahora.getDate()).padStart(2, '0');
            fecha = `${year}-${month}-${day}`;
        }

        fechaSeleccionada = fecha;

        // Actualizar título visual
        const tituloFecha = document.getElementById('fechaMostrada');
        if (tituloFecha) tituloFecha.textContent = `(${fecha})`;

        const { data } = await asistenciaSupabase
            .from('registros')
            .select('*')
            .eq('fecha', fecha)
            .order('timestamp', { ascending: false });

        registrosHoy = data || []; // "registrosHoy" ahora es genérico para "registrosCargados"

        // Aplicar filtros actuales (si hay texto o turno puesto)
        filtrarLista();

    } catch (e) {
        console.error('Error cargando registros:', e);
    }
}

function renderizarTabla(registros) {
    const tbody = document.getElementById('tablaRegistros');
    const emptyState = document.getElementById('listaVacia');

    // Validación de seguridad por si estamos en vista alumno (registro.html) y no hay tabla
    if (!tbody) return;

    if (!registros || registros.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    tbody.innerHTML = registros.map(r => `
        <tr>
            <td>${formatearHora(r.timestamp)}</td>
            <td>${r.email}</td>
            <td><span class="badge-turno badge-${r.turno}">${r.turno === 'matutino' ? '☀️' : '🌙'} ${r.turno}</span></td>
            <td>${r.fecha}</td>
            <td>
                ${r.turno_asistido ?
            `<span class="badge-turno badge-${r.turno_asistido}">
                        ${r.turno_asistido === 'matutino' ? '☀️' : (r.turno_asistido === 'vespertino' ? '🌙' : '❓')} ${r.turno_asistido}
                    </span>`
            : '<span style="color: #ccc;">--</span>'
        }
            </td>
            <td style="text-align: center;">
                <button class="btn-eliminar" onclick="eliminarRegistroIndividual('${r.id}')" title="Eliminar registro" style="border: none; background: transparent; font-size: 1.2rem; cursor: pointer;">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

function formatearHora(timestamp) {
    if (!timestamp) return '--:--';
    // Tomar solo YYYY-MM-DDTHH:mm:ss, ignorando offset Z, +00, etc.
    // Esto fuerza a que se interprete como hora local del navegador.
    const fechaLimpia = timestamp.substring(0, 19);
    const date = new Date(fechaLimpia);
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

async function cargarEstadisticas() {
    try {
        // Usar la fecha seleccionada para las estadisticas también
        const { data } = await asistenciaSupabase
            .from('registros')
            .select('turno')
            .eq('fecha', fechaSeleccionada);  // Filter by selected date

        let matutino = 0, vespertino = 0;
        (data || []).forEach(r => {
            if (r.turno === 'matutino') matutino++;
            else if (r.turno === 'vespertino') vespertino++;
        });

        const statMatElem = document.getElementById('statMatutino');
        const statVespElem = document.getElementById('statVespertino');
        const statTotalElem = document.getElementById('statTotal');

        if (statMatElem) statMatElem.textContent = matutino;
        if (statVespElem) statVespElem.textContent = vespertino;
        if (statTotalElem) statTotalElem.textContent = matutino + vespertino;

    } catch (e) {
        console.error('Error cargando estadísticas:', e);
    }
}

// ===================================
// FILTRAR Y EXPORTAR
// ===================================

function filtrarLista() {
    const filtroTurnoElem = document.getElementById('filtroTurno');
    const busquedaElem = document.getElementById('buscadorGeneral');

    // Validación de seguridad por si estamos en una página sin filtros
    if (!filtroTurnoElem || !busquedaElem) return;

    const filtroTurno = filtroTurnoElem.value;
    const busqueda = busquedaElem.value.toLowerCase().trim();

    let registrosFiltrados = registrosHoy;

    // 1. Filtrar por Turno
    if (filtroTurno !== 'todos') {
        registrosFiltrados = registrosFiltrados.filter(r => r.turno === filtroTurno);
    }

    // 2. Filtrar por Búsqueda (Live Search)
    if (busqueda) {
        registrosFiltrados = registrosFiltrados.filter(r =>
            r.email.toLowerCase().includes(busqueda) ||
            (r.fecha && r.fecha.includes(busqueda))
        );
    }

    renderizarTabla(registrosFiltrados);
    const totalHoyElem = document.getElementById('totalHoy');
    if (totalHoyElem) totalHoyElem.textContent = registrosFiltrados.length;
}

function exportarCSV() {
    if (registrosHoy.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const headers = ['Fecha', 'Hora', 'Correo', 'Turno'];
    const rows = registrosHoy.map(r => [
        r.fecha,
        formatearHora(r.timestamp),
        `"${r.email}"`,
        r.turno
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });

    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `asistencia_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
}

async function limpiarRegistros() {
    if (!confirm('¿Estás seguro de eliminar TODOS los registros de hoy?')) return;

    try {
        const fecha = fechaSeleccionada;
        const { error } = await asistenciaSupabase
            .from('registros')
            .delete()
            .eq('fecha', fecha);

        if (error) throw error;

        // Reset visual inmediato
        document.getElementById('statMatutino').textContent = '0';
        document.getElementById('statVespertino').textContent = '0';
        document.getElementById('statTotal').textContent = '0';
        document.getElementById('totalHoy').textContent = '0';

        await cargarRegistros();
        await cargarEstadisticas();
        alert('✅ Registros eliminados');

    } catch (e) {
        console.error('Error detallado:', e);
        alert(`Error al eliminar: ${e.message || e.error_description || 'Desconocido'}`);
    }
}

// ===================================
// GESTIÓN DE ALUMNOS
// ===================================

async function agregarAlumnoIndividual() {
    alert("⛔ La gestión de alumnos ahora es automática desde la base de datos central (PREMED). No puedes agregar alumnos manualmente aquí.");
}

async function importarListas() {
    alert("⛔ La gestión de alumnos ahora es automática desde la base de datos central (PREMED). No puedes importar listas aquí.");
}

async function eliminarAlumno(email) {
    alert("⛔ No puedes eliminar alumnos desde este módulo. Debes hacerlo en el sistema central de alumnos.");
}

// ===================================
// FUNCIONES DE UTILIDAD (Restauradas)
// ===================================

async function eliminarRegistroIndividual(id) {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;

    try {
        const { error } = await asistenciaSupabase
            .from('registros')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Actualizar localmente para inmediatez
        registrosHoy = registrosHoy.filter(r => r.id !== id);
        filtrarLista();
        cargarEstadisticas();

        mostrarMensaje('success', '🗑️ Registro eliminado');

    } catch (e) {
        console.error('Error al eliminar registro:', e);
        alert('Error al eliminar el registro');
    }
}

async function refrescarTablaManual() {
    const btn = document.getElementById('btnRefrescar');
    const icon = document.getElementById('iconRefrescar');

    // Animación
    if (btn) btn.disabled = true;
    if (icon) {
        icon.style.transition = 'transform 1s';
        icon.style.transform = 'rotate(360deg)';
    }

    await cargarRegistros();
    await cargarEstadisticas();

    // Reset animación
    setTimeout(() => {
        if (btn) btn.disabled = false;
        if (icon) {
            icon.style.transition = 'none';
            icon.style.transform = 'rotate(0deg)';
        }
        mostrarMensaje('success', '🔄 Datos actualizados');
    }, 500);
}
