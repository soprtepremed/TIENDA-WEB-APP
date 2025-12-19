// ===================================
// Módulo de Asistencia - JavaScript
// ===================================

// FUNCIONES GLOBALES (disponibles inmediatamente para onclick)
// Se redefinen más adelante con la implementación completa
window.cambiarTab = function (tab) {
    const container = document.querySelector('.container');
    if (tab === 'admin') container?.classList.add('admin-expanded');
    else container?.classList.remove('admin-expanded');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const t = document.getElementById('tab' + tab.charAt(0).toUpperCase() + tab.slice(1));
    if (t) t.classList.add('active');
};
window.cambiarSubtab = function (subtab) {
    document.querySelectorAll('.subtab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.subtab === subtab));
    document.querySelectorAll('.subtab-content').forEach(c => c.classList.remove('active'));
    const t = document.getElementById('subtab' + subtab.charAt(0).toUpperCase() + subtab.slice(1));
    if (t) t.classList.add('active');
};
window.seleccionarTurno = function (turno) {
    window.turnoSeleccionado = turno;
    document.querySelectorAll('.turno-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.turno === turno));
};
window.marcarAsistencia = function () { console.warn('marcarAsistencia aún no lista'); };
window.cargarRegistros = function () { };
window.filtrarLista = function () { };
window.exportarCSV = function () { };
window.exportarExcel = function () { };
window.exportarPDF = function () { };
window.limpiarRegistros = function () { };
window.refrescarTablaManual = function () { };
window.eliminarRegistroIndividual = function () { };
window.guardarConfiguracion = function () { };
window.copiarEnlaceAlumno = function () { };

// Configuración de Supabase
const ASISTENCIA_SUPABASE_URL = 'https://api.premed.mx';
const ASISTENCIA_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwpHkJIv1aR5AXv2Jpwq2Kb7-FyhNXIvZ4yq-BMmzoqs3rdFeFkwrQL0rjAm2TtHDFSLA/exec';

// Variables globales
let asistenciaSupabase;
let premedSupabase;
let turnoSeleccionado = 'matutino';
let configuracion = { nombre_sesion: 'Clase General', script_url: DEFAULT_SCRIPT_URL };
let correosAutorizados = { matutino: [], vespertino: [] };
let registrosHoy = [];
const ahoraIni = new Date();
const yearIni = ahoraIni.getFullYear();
const monthIni = String(ahoraIni.getMonth() + 1).padStart(2, '0');
const dayIni = String(ahoraIni.getDate()).padStart(2, '0');
let fechaSeleccionada = `${yearIni}-${monthIni}-${dayIni}`;

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📋 Inicializando módulo de Asistencia...');
    initAsistenciaSupabase();

    const fechaInput = document.getElementById('filtroFecha');
    if (fechaInput) {
        fechaInput.value = fechaSeleccionada;
    }

    const timeoutPromise = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms));

    try {
        await Promise.race([cargarConfiguracion(), timeoutPromise(5000)]);
    } catch (error) {
        console.warn('⚠️ Config timeout');
        const nombreSesionElem = document.getElementById('nombreSesion');
        if (nombreSesionElem) nombreSesionElem.textContent = configuracion.nombre_sesion;
    }

    try {
        await Promise.race([cargarCorreosAutorizados(), timeoutPromise(5000)]);
    } catch (e) { console.warn('Error cargando alumnos:', e); }

    try {
        await cargarRegistros();
        await cargarEstadisticas();
        suscribirCambios();
    } catch (e) { console.error('Error en carga inicial:', e); }

    console.log('✅ Módulo de Asistencia listo');

    const linkAlumnoInput = document.getElementById('linkAlumno');
    if (linkAlumnoInput) {
        const currentUrl = window.location.href;
        const registroUrl = currentUrl.includes('asistencia.html')
            ? currentUrl.replace('asistencia.html', 'registro-v2.html')
            : currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1) + 'registro-v2.html';
        linkAlumnoInput.value = registroUrl;
    }
});

function initAsistenciaSupabase() {
    if (asistenciaSupabase && premedSupabase) return asistenciaSupabase;

    if (window.supabase) {
        try {
            if (!asistenciaSupabase) {
                asistenciaSupabase = window.supabase.createClient(ASISTENCIA_SUPABASE_URL, ASISTENCIA_SUPABASE_ANON_KEY, {
                    db: { schema: 'soporte' },
                    auth: { persistSession: true, autoRefreshToken: true }
                });
                console.log('✅ Supabase conectado (esquema: soporte)');
            }

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
        console.warn("⏳ Librería Supabase aún no carga");
        return null;
    }
}

function suscribirCambios() {
    if (!asistenciaSupabase) return;

    asistenciaSupabase
        .channel('tabla_registros')
        .on('postgres_changes',
            { event: '*', schema: 'public', table: 'registros' },
            (payload) => {
                console.log('🔄 Cambio detectado:', payload);
                if (payload.eventType === 'INSERT') {
                    const nuevoRegistro = payload.new;
                    if (nuevoRegistro.fecha === fechaSeleccionada) {
                        registrosHoy.unshift(nuevoRegistro);
                        registrosHoy.sort((a, b) => (b.timestamp || '').localeCompare(a.timestamp || ''));
                        filtrarLista();
                        cargarEstadisticas();
                        mostrarNotificacionRealtime(`Nuevo registro: ${nuevoRegistro.email}`);
                    }
                }
                if (payload.eventType === 'DELETE') {
                    const idEliminado = payload.old.id;
                    registrosHoy = registrosHoy.filter(r => r.id !== idEliminado);
                    filtrarLista();
                    cargarEstadisticas();
                }
            }
        )
        .subscribe();
    console.log('📡 Escuchando cambios en tiempo real...');
}

function mostrarNotificacionRealtime(texto) {
    const notif = document.createElement('div');
    notif.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#1B3A6B;color:white;padding:12px 24px;border-radius:8px;box-shadow:0 4px 6px rgba(0,0,0,0.1);z-index:10000;';
    notif.textContent = texto;
    document.body.appendChild(notif);
    setTimeout(() => { notif.style.opacity = '0'; notif.style.transition = 'opacity 0.5s'; setTimeout(() => notif.remove(), 500); }, 3000);
}

function cambiarTab(tab) {
    const container = document.querySelector('.container');
    if (tab === 'admin') container?.classList.add('admin-expanded');
    else container?.classList.remove('admin-expanded');
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tab));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const targetTab = document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`);
    if (targetTab) targetTab.classList.add('active');
}
window.cambiarTab = cambiarTab;

function cambiarSubtab(subtab) {
    document.querySelectorAll('.subtab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.subtab === subtab));
    document.querySelectorAll('.subtab-content').forEach(content => content.classList.remove('active'));
    const targetSubtab = document.getElementById(`subtab${subtab.charAt(0).toUpperCase() + subtab.slice(1)}`);
    if (targetSubtab) targetSubtab.classList.add('active');
}
window.cambiarSubtab = cambiarSubtab;

function seleccionarTurno(turno) {
    turnoSeleccionado = turno;
    document.querySelectorAll('.turno-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.turno === turno));
}
window.seleccionarTurno = seleccionarTurno;

async function marcarAsistencia() {
    const inputCorreo = document.getElementById('inputCorreo');
    const btnMarcar = document.getElementById('btnMarcarAsistencia');

    if (!inputCorreo || !btnMarcar) {
        console.error("❌ Error DOM: No se encuentran los inputs de registro.");
        return;
    }

    const email = inputCorreo.value.toLowerCase().trim();

    if (!email || !email.includes('@') || email.length < 5) {
        mostrarMensaje('error', '❌ Por favor ingresa un correo válido.');
        return;
    }

    const enMatutino = correosAutorizados?.matutino?.includes(email);
    const enVespertino = correosAutorizados?.vespertino?.includes(email);

    if (!enMatutino && !enVespertino) {
        mostrarMensaje('error', '⚠️ Correo no encontrado en la lista de alumnos activos.');
        return;
    }

    let turnoAsignado = turnoSeleccionado;
    if (enMatutino && !enVespertino) turnoAsignado = 'matutino';
    if (!enMatutino && enVespertino) turnoAsignado = 'vespertino';

    btnMarcar.disabled = true;
    const textoOriginal = btnMarcar.textContent;
    btnMarcar.textContent = 'Registrando...';

    try {
        const client = initAsistenciaSupabase();
        if (!client) throw new Error("No hay conexión con la base de datos.");

        const ahora = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const hoy = `${ahora.getFullYear()}-${pad(ahora.getMonth() + 1)}-${pad(ahora.getDate())}`;
        const timestampLocal = `${hoy}T${pad(ahora.getHours())}:${pad(ahora.getMinutes())}:${pad(ahora.getSeconds())}`;

        let turnoAsistidoReal = 'otro';
        const h = ahora.getHours();
        if (h >= 7 && h < 14) turnoAsistidoReal = 'matutino';
        else if (h >= 14 && h < 22) turnoAsistidoReal = 'vespertino';

        const { error } = await client
            .from('registros')
            .insert({
                email: email,
                turno: turnoAsignado,
                turno_asistido: turnoAsistidoReal,
                fecha: hoy,
                timestamp: timestampLocal
            });

        if (error) throw error;

        enviarAGoogleSheets(email, turnoAsignado, turnoAsistidoReal).catch(err => console.warn("Fallo Sheets:", err));

        mostrarMensaje('success', `✅ Asistencia Correcta (${turnoAsignado.toUpperCase()})`);
        inputCorreo.value = '';

        cargarRegistros();
        cargarEstadisticas();

    } catch (error) {
        console.error('Error Registro:', error);
        if (error.code === '23505' || (error.message && error.message.includes('duplicate key'))) {
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
window.marcarAsistencia = marcarAsistencia;

async function enviarAGoogleSheets(email, turno, turnoAsistidoReal = '') {
    if (!configuracion.script_url) return;
    const turnoCapitalizado = turno.charAt(0).toUpperCase() + turno.slice(1).toLowerCase();
    try {
        await fetch(configuracion.script_url, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, turno: turnoCapitalizado, turno_asistido: turnoAsistidoReal, timestamp: new Date().toISOString() })
        });
        console.log('📨 Enviado a Google Sheets');
    } catch (e) { console.error('Error enviando a Sheets:', e); }
}

function mostrarMensaje(tipo, texto) {
    const mensajeDiv = document.getElementById('mensajeRegistro');
    if (!mensajeDiv) return;
    mensajeDiv.className = `mensaje-registro ${tipo}`;
    mensajeDiv.textContent = texto;
    mensajeDiv.classList.remove('hidden');
    if (tipo === 'success') setTimeout(() => mensajeDiv.classList.add('hidden'), 5000);
}

async function cargarConfiguracion() {
    try {
        const { data } = await asistenciaSupabase.from('configuracion').select('*').single();
        if (data) {
            configuracion = data;
            const nombreSesionElem = document.getElementById('nombreSesion');
            if (nombreSesionElem && configuracion.nombre_sesion) nombreSesionElem.textContent = configuracion.nombre_sesion;
            const configNombreElem = document.getElementById('configNombre');
            const configScriptElem = document.getElementById('configScript');
            if (configNombreElem) configNombreElem.value = data.nombre_sesion || '';
            if (configScriptElem) configScriptElem.value = data.script_url || DEFAULT_SCRIPT_URL;
        }
    } catch (e) { console.error('Error cargando config:', e); }
}

async function cargarCorreosAutorizados() {
    try {
        console.log('🔄 Cargando alumnos...');
        const supabaseClient = initAsistenciaSupabase();
        if (!supabaseClient) return;

        const { data, error } = await supabaseClient.from('correos_autorizados').select('*');
        if (error) { console.error('Error cargando correos:', error); return; }

        correosAutorizados = { matutino: [], vespertino: [] };
        const alumnosActivos = (data || []).filter(d => d.activo === true);

        alumnosActivos.forEach(item => {
            const email = item.email ? item.email.toLowerCase() : '';
            if (!email) return;
            if (item.turno === 'matutino') correosAutorizados.matutino.push(email);
            else if (item.turno === 'vespertino') correosAutorizados.vespertino.push(email);
        });

        const countMatElem = document.getElementById('countMatutino');
        const countVespElem = document.getElementById('countVespertino');
        if (countMatElem) countMatElem.textContent = correosAutorizados.matutino.length;
        if (countVespElem) countVespElem.textContent = correosAutorizados.vespertino.length;

        renderizarListaAlumnos(alumnosActivos.map(d => ({ ...d, nombre: d.nombre_alumno || 'Sin Nombre', modalidad: 'presencial' })));
        console.log(`✅ Alumnos cargados: ${alumnosActivos.length}`);
    } catch (e) { console.error('Error en carga de alumnos:', e); }
}

function renderizarListaAlumnos(alumnos) {
    const containerMat = document.getElementById('listaAlumnosMatutino');
    const containerVesp = document.getElementById('listaAlumnosVespertino');
    if (containerMat && containerVesp) {
        const matutinos = alumnos.filter(a => a.turno === 'matutino');
        const vespertinos = alumnos.filter(a => a.turno === 'vespertino');
        containerMat.innerHTML = matutinos.length ? matutinos.map(a => generarHTMLAlumno(a)).join('') : '<div class="empty-state" style="padding:20px;"><p>Sin alumnos</p></div>';
        containerVesp.innerHTML = vespertinos.length ? vespertinos.map(a => generarHTMLAlumno(a)).join('') : '<div class="empty-state" style="padding:20px;"><p>Sin alumnos</p></div>';
        return;
    }
    const container = document.getElementById('listaAlumnos');
    if (!container) return;
    if (!alumnos || alumnos.length === 0) { container.innerHTML = '<div class="empty-state"><span class="empty-icon">👥</span><p>No hay alumnos</p></div>'; return; }
    container.innerHTML = alumnos.map(a => generarHTMLAlumno(a)).join('');
}

function generarHTMLAlumno(a) {
    return `<div class="alumno-item"><span class="alumno-email">${a.email}</span><div class="alumno-actions"><span class="badge-turno badge-${a.turno}">${a.turno === 'matutino' ? '☀️' : '🌙'} ${a.turno}</span></div></div>`;
}

async function cargarRegistros() {
    try {
        const fechaInput = document.getElementById('filtroFecha');
        let fecha = fechaInput?.value || fechaSeleccionada;
        fechaSeleccionada = fecha;
        const tituloFecha = document.getElementById('fechaMostrada');
        if (tituloFecha) tituloFecha.textContent = `(${fecha})`;
        const { data } = await asistenciaSupabase.from('registros').select('*').eq('fecha', fecha).order('timestamp', { ascending: false });
        registrosHoy = data || [];
        filtrarLista();
    } catch (e) { console.error('Error cargando registros:', e); }
}

function renderizarTabla(registros) {
    const tbody = document.getElementById('tablaRegistros');
    const emptyState = document.getElementById('listaVacia');
    if (!tbody) return;
    if (!registros || registros.length === 0) { tbody.innerHTML = ''; if (emptyState) emptyState.classList.remove('hidden'); return; }
    if (emptyState) emptyState.classList.add('hidden');
    tbody.innerHTML = registros.map(r => `<tr><td>${formatearHora(r.timestamp)}</td><td>${r.email}</td><td><span class="badge-turno badge-${r.turno}">${r.turno === 'matutino' ? '☀️' : '🌙'} ${r.turno}</span></td><td>${r.fecha}</td><td>${r.turno_asistido ? `<span class="badge-turno badge-${r.turno_asistido}">${r.turno_asistido === 'matutino' ? '☀️' : '🌙'} ${r.turno_asistido}</span>` : '--'}</td><td style="text-align:center;"><button class="btn-eliminar" onclick="eliminarRegistroIndividual('${r.id}')" title="Eliminar" style="border:none;background:transparent;font-size:1.2rem;cursor:pointer;">🗑️</button></td></tr>`).join('');
}

function formatearHora(timestamp) {
    if (!timestamp) return '--:--';
    const fechaLimpia = timestamp.substring(0, 19);
    const date = new Date(fechaLimpia);
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

async function cargarEstadisticas() {
    try {
        const { data } = await asistenciaSupabase.from('registros').select('turno').eq('fecha', fechaSeleccionada);
        let matutino = 0, vespertino = 0;
        (data || []).forEach(r => { if (r.turno === 'matutino') matutino++; else if (r.turno === 'vespertino') vespertino++; });
        const statMatElem = document.getElementById('statMatutino');
        const statVespElem = document.getElementById('statVespertino');
        const statTotalElem = document.getElementById('statTotal');
        if (statMatElem) statMatElem.textContent = matutino;
        if (statVespElem) statVespElem.textContent = vespertino;
        if (statTotalElem) statTotalElem.textContent = matutino + vespertino;
    } catch (e) { console.error('Error cargando estadísticas:', e); }
}

function filtrarLista() {
    const filtroTurnoElem = document.getElementById('filtroTurno');
    const busquedaElem = document.getElementById('buscadorGeneral');
    if (!filtroTurnoElem || !busquedaElem) return;
    const filtroTurno = filtroTurnoElem.value;
    const busqueda = busquedaElem.value.toLowerCase().trim();
    let registrosFiltrados = registrosHoy;
    if (filtroTurno !== 'todos') registrosFiltrados = registrosFiltrados.filter(r => r.turno === filtroTurno);
    if (busqueda) registrosFiltrados = registrosFiltrados.filter(r => r.email.toLowerCase().includes(busqueda) || (r.fecha && r.fecha.includes(busqueda)));
    renderizarTabla(registrosFiltrados);
    const totalHoyElem = document.getElementById('totalHoy');
    if (totalHoyElem) totalHoyElem.textContent = registrosFiltrados.length;
}
window.filtrarLista = filtrarLista;

function exportarCSV() {
    if (registrosHoy.length === 0) { alert('No hay datos para exportar.'); return; }
    const headers = ['Fecha', 'Hora', 'Correo', 'Turno'];
    const rows = registrosHoy.map(r => [r.fecha, formatearHora(r.timestamp), `"${r.email}"`, r.turno]);
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\r\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `asistencia_${fechaSeleccionada}.csv`;
    link.click();
}
window.exportarCSV = exportarCSV;

function exportarExcel() {
    if (registrosHoy.length === 0) { alert('No hay datos para exportar.'); return; }
    const data = registrosHoy.map(r => ({ 'Fecha': r.fecha, 'Hora': formatearHora(r.timestamp), 'Correo': r.email, 'Turno': r.turno, 'Turno Asistido': r.turno_asistido || '--' }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asistencia');
    XLSX.writeFile(wb, `asistencia_${fechaSeleccionada}.xlsx`);
}
window.exportarExcel = exportarExcel;

function exportarPDF() {
    if (registrosHoy.length === 0) { alert('No hay datos para exportar.'); return; }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Reporte de Asistencia', 14, 22);
    doc.setFontSize(11);
    doc.text(`Fecha: ${fechaSeleccionada}`, 14, 30);
    const tableData = registrosHoy.map(r => [formatearHora(r.timestamp), r.email, r.turno, r.turno_asistido || '--']);
    doc.autoTable({ head: [['Hora', 'Correo', 'Turno', 'Turno Asistido']], body: tableData, startY: 38, styles: { fontSize: 9 }, headStyles: { fillColor: [27, 58, 107] } });
    doc.save(`asistencia_${fechaSeleccionada}.pdf`);
}
window.exportarPDF = exportarPDF;

async function guardarConfiguracion() {
    const nombreInput = document.getElementById('configNombre');
    const scriptInput = document.getElementById('configScript');
    if (!nombreInput || !scriptInput) return;
    const nombre = nombreInput.value.trim();
    const script = scriptInput.value.trim();
    if (!nombre) { alert('Por favor ingresa un nombre de sesión.'); return; }
    try {
        const { error } = await asistenciaSupabase.from('configuracion').update({ nombre_sesion: nombre, script_url: script || DEFAULT_SCRIPT_URL }).eq('id', 1);
        if (error) throw error;
        configuracion.nombre_sesion = nombre;
        configuracion.script_url = script || DEFAULT_SCRIPT_URL;
        const nombreSesionElem = document.getElementById('nombreSesion');
        if (nombreSesionElem) nombreSesionElem.textContent = nombre;
        alert('✅ Configuración guardada');
    } catch (e) { console.error('Error guardando configuración:', e); alert('Error al guardar la configuración'); }
}
window.guardarConfiguracion = guardarConfiguracion;

function copiarEnlaceAlumno() {
    const linkInput = document.getElementById('linkAlumno');
    if (linkInput) {
        navigator.clipboard.writeText(linkInput.value).then(() => alert('📋 Enlace copiado')).catch(() => { linkInput.select(); document.execCommand('copy'); alert('📋 Enlace copiado'); });
    }
}
window.copiarEnlaceAlumno = copiarEnlaceAlumno;

async function limpiarRegistros() {
    if (!confirm('¿Estás seguro de eliminar TODOS los registros de hoy?')) return;
    try {
        const { error } = await asistenciaSupabase.from('registros').delete().eq('fecha', fechaSeleccionada);
        if (error) throw error;
        const statMatElem = document.getElementById('statMatutino');
        const statVespElem = document.getElementById('statVespertino');
        const statTotalElem = document.getElementById('statTotal');
        const totalHoyElem = document.getElementById('totalHoy');
        if (statMatElem) statMatElem.textContent = '0';
        if (statVespElem) statVespElem.textContent = '0';
        if (statTotalElem) statTotalElem.textContent = '0';
        if (totalHoyElem) totalHoyElem.textContent = '0';
        await cargarRegistros();
        await cargarEstadisticas();
        alert('✅ Registros eliminados');
    } catch (e) { console.error('Error:', e); alert('Error al eliminar'); }
}
window.limpiarRegistros = limpiarRegistros;

async function eliminarRegistroIndividual(id) {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
        const { error } = await asistenciaSupabase.from('registros').delete().eq('id', id);
        if (error) throw error;
        registrosHoy = registrosHoy.filter(r => r.id !== id);
        filtrarLista();
        cargarEstadisticas();
        mostrarMensaje('success', '🗑️ Registro eliminado');
    } catch (e) { console.error('Error:', e); alert('Error al eliminar'); }
}
window.eliminarRegistroIndividual = eliminarRegistroIndividual;

async function refrescarTablaManual() {
    const btn = document.getElementById('btnRefrescar');
    const icon = document.getElementById('iconRefrescar');
    if (btn) btn.disabled = true;
    if (icon) { icon.style.transition = 'transform 1s'; icon.style.transform = 'rotate(360deg)'; }
    await cargarRegistros();
    await cargarEstadisticas();
    setTimeout(() => {
        if (btn) btn.disabled = false;
        if (icon) { icon.style.transition = 'none'; icon.style.transform = 'rotate(0deg)'; }
        mostrarMensaje('success', '🔄 Datos actualizados');
    }, 500);
}
window.refrescarTablaManual = refrescarTablaManual;

async function cargarRegistros() {
    try {
        const fechaInput = document.getElementById('filtroFecha');
        let fecha = fechaInput?.value || fechaSeleccionada;
        fechaSeleccionada = fecha;
        const tituloFecha = document.getElementById('fechaMostrada');
        if (tituloFecha) tituloFecha.textContent = `(${fecha})`;
        const { data } = await asistenciaSupabase.from('registros').select('*').eq('fecha', fecha).order('timestamp', { ascending: false });
        registrosHoy = data || [];
        filtrarLista();
    } catch (e) { console.error('Error cargando registros:', e); }
}
window.cargarRegistros = cargarRegistros;
