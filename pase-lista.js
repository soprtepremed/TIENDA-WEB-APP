// ===================================
// Módulo Pase de Lista - JavaScript
// ===================================

// Configuración Supabase
const SUPABASE_URL = 'https://api.premed.mx';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

let supabaseClient;
let registros = [];
let correosAutorizados = { matutino: [], vespertino: [] };

// Fecha actual
const hoy = new Date();
let fechaSeleccionada = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('📋 Inicializando Pase de Lista...');
    initSupabase();

    // Set fecha actual
    const fechaInput = document.getElementById('filtroFecha');
    if (fechaInput) fechaInput.value = fechaSeleccionada;

    // Generar enlace para alumnos
    const linkInput = document.getElementById('linkAlumno');
    if (linkInput) {
        const baseUrl = window.location.href.replace('pase-lista.html', '');
        linkInput.value = baseUrl + 'registro-lista.html';
    }

    await cargarCorreosAutorizados();
    await cargarRegistros();
    suscribirCambios();

    console.log('✅ Pase de Lista listo');
});

function initSupabase() {
    if (supabaseClient) return supabaseClient;
    if (window.supabase) {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            db: { schema: 'soporte' },
            auth: { persistSession: true }
        });
        console.log('✅ Supabase conectado');
    }
    return supabaseClient;
}

async function cargarCorreosAutorizados() {
    try {
        const { data, error } = await supabaseClient.from('correos_autorizados').select('*').eq('activo', true);
        if (error) throw error;

        correosAutorizados = { matutino: [], vespertino: [] };
        (data || []).forEach(item => {
            const email = item.email?.toLowerCase();
            if (!email) return;
            if (item.turno === 'matutino') correosAutorizados.matutino.push({ email, nombre: item.nombre_alumno || '' });
            else if (item.turno === 'vespertino') correosAutorizados.vespertino.push({ email, nombre: item.nombre_alumno || '' });
        });

        const total = correosAutorizados.matutino.length + correosAutorizados.vespertino.length;
        const statAutorizados = document.getElementById('statAutorizados');
        if (statAutorizados) statAutorizados.textContent = total;

        console.log(`✅ Correos autorizados: ${total}`);
    } catch (e) {
        console.error('Error cargando correos:', e);
    }
}

async function cargarRegistros() {
    try {
        const fechaInput = document.getElementById('filtroFecha');
        if (fechaInput) fechaSeleccionada = fechaInput.value;

        const { data, error } = await supabaseClient
            .from('pase_lista')
            .select('*')
            .eq('fecha', fechaSeleccionada)
            .order('timestamp', { ascending: false });

        if (error) throw error;
        registros = data || [];

        actualizarEstadisticas();
        filtrarLista();

        console.log(`📋 Registros cargados: ${registros.length}`);
    } catch (e) {
        console.error('Error cargando registros:', e);
    }
}

function actualizarEstadisticas() {
    let matutino = 0, vespertino = 0;
    registros.forEach(r => {
        if (r.turno_oficial === 'matutino') matutino++;
        else if (r.turno_oficial === 'vespertino') vespertino++;
    });

    document.getElementById('statMatutino').textContent = matutino;
    document.getElementById('statVespertino').textContent = vespertino;
    document.getElementById('statTotal').textContent = registros.length;
}

function filtrarLista() {
    const filtroTurno = document.getElementById('filtroTurno')?.value || 'todos';
    const busqueda = document.getElementById('buscador')?.value.toLowerCase().trim() || '';

    let filtrados = registros;

    if (filtroTurno !== 'todos') {
        filtrados = filtrados.filter(r => r.turno_oficial === filtroTurno);
    }

    if (busqueda) {
        filtrados = filtrados.filter(r =>
            r.email?.toLowerCase().includes(busqueda) ||
            r.nombre?.toLowerCase().includes(busqueda)
        );
    }

    renderizarTabla(filtrados);
}

function renderizarTabla(datos) {
    const tbody = document.getElementById('tablaRegistros');
    const emptyState = document.getElementById('emptyState');

    if (!datos || datos.length === 0) {
        tbody.innerHTML = '';
        emptyState?.classList.remove('hidden');
        return;
    }

    emptyState?.classList.add('hidden');

    tbody.innerHTML = datos.map(r => `
        <tr>
            <td>${formatearHora(r.timestamp)}</td>
            <td>${r.email || '--'}</td>
            <td>${r.nombre || '--'}</td>
            <td><span class="badge badge-${r.turno_oficial}">${r.turno_oficial === 'matutino' ? '☀️' : '🌙'} ${r.turno_oficial || '--'}</span></td>
            <td><span class="badge badge-${r.turno_asistido}">${r.turno_asistido === 'matutino' ? '☀️' : '🌙'} ${r.turno_asistido || '--'}</span></td>
            <td><button onclick="eliminarRegistro('${r.id}')" style="border:none;background:none;cursor:pointer;font-size:1.2rem;">🗑️</button></td>
        </tr>
    `).join('');
}

function formatearHora(timestamp) {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

function suscribirCambios() {
    if (!supabaseClient) return;

    supabaseClient
        .channel('pase_lista_changes')
        .on('postgres_changes', { event: '*', schema: 'soporte', table: 'pase_lista' }, (payload) => {
            console.log('🔄 Cambio detectado:', payload.eventType);

            if (payload.eventType === 'INSERT') {
                const nuevo = payload.new;
                if (nuevo.fecha === fechaSeleccionada) {
                    registros.unshift(nuevo);
                    actualizarEstadisticas();
                    filtrarLista();
                    mostrarNotificacion(`Nuevo registro: ${nuevo.email}`);
                }
            }

            if (payload.eventType === 'DELETE') {
                registros = registros.filter(r => r.id !== payload.old.id);
                actualizarEstadisticas();
                filtrarLista();
            }
        })
        .subscribe();

    console.log('📡 Escuchando cambios en tiempo real...');
}

function mostrarNotificacion(texto) {
    const notif = document.createElement('div');
    notif.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#1B3A6B;color:white;padding:12px 24px;border-radius:8px;z-index:10000;';
    notif.textContent = texto;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 3000);
}

async function eliminarRegistro(id) {
    if (!confirm('¿Eliminar este registro?')) return;

    try {
        const { error } = await supabaseClient.from('pase_lista').delete().eq('id', id);
        if (error) throw error;
        registros = registros.filter(r => r.id !== id);
        actualizarEstadisticas();
        filtrarLista();
    } catch (e) {
        console.error('Error:', e);
        alert('Error al eliminar');
    }
}

async function limpiarRegistros() {
    if (!confirm('¿Eliminar TODOS los registros de hoy?')) return;

    try {
        const { error } = await supabaseClient.from('pase_lista').delete().eq('fecha', fechaSeleccionada);
        if (error) throw error;
        registros = [];
        actualizarEstadisticas();
        filtrarLista();
        alert('✅ Registros eliminados');
    } catch (e) {
        console.error('Error:', e);
        alert('Error al limpiar');
    }
}

function exportarCSV() {
    if (registros.length === 0) { alert('No hay datos'); return; }

    const headers = ['Hora', 'Correo', 'Nombre', 'Turno Oficial', 'Turno Asistido'];
    const rows = registros.map(r => [
        formatearHora(r.timestamp),
        r.email,
        r.nombre || '',
        r.turno_oficial,
        r.turno_asistido
    ]);

    const csv = [headers.join(','), ...rows.map(row => row.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pase_lista_${fechaSeleccionada}.csv`;
    link.click();
}

function exportarExcel() {
    if (registros.length === 0) { alert('No hay datos'); return; }

    const data = registros.map(r => ({
        'Hora': formatearHora(r.timestamp),
        'Correo': r.email,
        'Nombre': r.nombre || '',
        'Turno Oficial': r.turno_oficial,
        'Turno Asistido': r.turno_asistido
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pase de Lista');
    XLSX.writeFile(wb, `pase_lista_${fechaSeleccionada}.xlsx`);
}

function copiarEnlace() {
    const input = document.getElementById('linkAlumno');
    navigator.clipboard.writeText(input.value).then(() => alert('📋 Enlace copiado'));
}

// Exponer globalmente
window.cargarRegistros = cargarRegistros;
window.filtrarLista = filtrarLista;
window.eliminarRegistro = eliminarRegistro;
window.limpiarRegistros = limpiarRegistros;
window.exportarCSV = exportarCSV;
window.exportarExcel = exportarExcel;
window.copiarEnlace = copiarEnlace;
