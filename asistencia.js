// ===================================
// Módulo de Asistencia - JavaScript
// ===================================

// Configuración de Supabase
const ASISTENCIA_SUPABASE_URL = 'https://api.premed.mx';
const ASISTENCIA_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';
const DEFAULT_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzc5wIAEuYbbFsxlCKPH9P9Bi0657z1LdAlBMIHA55nabzQQLyPWdRQ1dOH7G9ls3-4/exec';

// Variables globales
let asistenciaSupabase;
let turnoSeleccionado = 'matutino';
let configuracion = { nombre_sesion: 'Clase General', script_url: DEFAULT_SCRIPT_URL };
let correosAutorizados = { matutino: [], vespertino: [] };
let registrosHoy = [];

// Inicializar
document.addEventListener('DOMContentLoaded', async () => {
    console.log('\uD83D\uDCCB Inicializando módulo de Asistencia...');
    initAsistenciaSupabase();
    await cargarConfiguracion();
    await cargarCorreosAutorizados();
    await cargarRegistrosHoy();
    await cargarEstadisticas();
    console.log('\u2705 Módulo de Asistencia listo');
});

// Inicializar cliente Supabase
function initAsistenciaSupabase() {
    if (window.supabase && !asistenciaSupabase) {
        asistenciaSupabase = window.supabase.createClient(ASISTENCIA_SUPABASE_URL, ASISTENCIA_SUPABASE_ANON_KEY, {
            db: { schema: 'public' }
        });
        console.log('\u2705 Supabase conectado (esquema: asistencia)');
    }
    return asistenciaSupabase;
}

// ===================================
// NAVEGACIÓN
// ===================================

function cambiarTab(tab) {
    // Actualizar botones
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Actualizar contenido
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`tab${tab.charAt(0).toUpperCase() + tab.slice(1)}`).classList.add('active');
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
    document.getElementById(`subtab${subtab.charAt(0).toUpperCase() + subtab.slice(1)}`).classList.add('active');
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

async function marcarAsistencia() {
    const inputCorreo = document.getElementById('inputCorreo');
    const btnMarcar = document.getElementById('btnMarcarAsistencia');
    const mensajeDiv = document.getElementById('mensajeRegistro');

    const email = inputCorreo.value.toLowerCase().trim();

    // Validar correo
    if (!email || !email.includes('@') || email.length < 5) {
        mostrarMensaje('error', '\u274C Por favor ingresa un correo válido.');
        return;
    }

    // Verificar si está autorizado
    const enMatutino = correosAutorizados.matutino.includes(email);
    const enVespertino = correosAutorizados.vespertino.includes(email);

    if (!enMatutino && !enVespertino) {
        mostrarMensaje('error', '\u274C Tu correo no está registrado en la base de datos.');
        return;
    }

    // Determinar turno correcto
    let turnoAsignado = turnoSeleccionado;
    if (enMatutino && !enVespertino) turnoAsignado = 'matutino';
    if (!enMatutino && enVespertino) turnoAsignado = 'vespertino';

    // Avisar si el turno no coincide
    if (turnoAsignado !== turnoSeleccionado && !(enMatutino && enVespertino)) {
        mostrarMensaje('warning', `\u26A0 Tu turno asignado es ${turnoAsignado.toUpperCase()}. Se registrará en tu turno correcto.`);
        await new Promise(r => setTimeout(r, 1500));
    }

    // Deshabilitar botón
    btnMarcar.disabled = true;
    btnMarcar.textContent = 'Registrando...';

    try {
        // Verificar si ya registró hoy
        const hoy = new Date().toISOString().split('T')[0];
        const { data: existente } = await asistenciaSupabase
            .from('registros')
            .select('id')
            .eq('email', email)
            .eq('fecha', hoy)
            .single();

        if (existente) {
            mostrarMensaje('warning', '\u26A0 Ya registraste tu asistencia hoy.');
            return;
        }

        // Registrar en Supabase
        const { error } = await asistenciaSupabase
            .from('registros')
            .insert({
                email: email,
                turno: turnoAsignado,
                fecha: hoy
            });

        if (error) throw error;

        // Enviar a Google Sheets
        // El usuario solicitó enviar "el turno que está colocando el alumno" (turnoSeleccionado) 
        // o el asignado. Para consistencia con el histórico, enviaremos Capitalizado.
        await enviarAGoogleSheets(email, turnoAsignado);

        // Éxito
        mostrarMensaje('success', `\u2705 ¡Asistencia registrada! Turno: ${turnoAsignado.toUpperCase()}`);
        inputCorreo.value = '';

        // Recargar lista
        await cargarRegistrosHoy();
        await cargarEstadisticas();

    } catch (error) {
        console.error('Error:', error);
        if (error.code === '23505') {
            mostrarMensaje('warning', '\u26A0 Ya registraste tu asistencia hoy.');
        } else {
            mostrarMensaje('error', '\u274C Error al registrar. Intenta de nuevo.');
        }
    } finally {
        btnMarcar.disabled = false;
        btnMarcar.textContent = 'MARCAR ASISTENCIA';
    }
}

async function enviarAGoogleSheets(email, turno) {
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
                turno: turnoCapitalizado, // Clave estándar
                Turno: turnoCapitalizado, // Clave alternativa por si el script busca mayúscula
                shift: turnoCapitalizado, // Clave en inglés por si acaso
                timestamp: new Date().toISOString()
            })
        });
        console.log('\uD83D\uDCE4 Enviado a Google Sheets: ' + turnoCapitalizado);
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
        const { data } = await asistenciaSupabase
            .from('correos_autorizados')
            .select('email, turno')
            .eq('activo', true);

        correosAutorizados = { matutino: [], vespertino: [] };

        if (data) {
            data.forEach(item => {
                if (item.turno === 'matutino') {
                    correosAutorizados.matutino.push(item.email.toLowerCase());
                } else if (item.turno === 'vespertino') {
                    correosAutorizados.vespertino.push(item.email.toLowerCase());
                }
            });
        }

        // Actualizar UI - Solo si existen los elementos
        const countMatElem = document.getElementById('countMatutino');
        const countVespElem = document.getElementById('countVespertino');
        if (countMatElem) countMatElem.textContent = correosAutorizados.matutino.length;
        if (countVespElem) countVespElem.textContent = correosAutorizados.vespertino.length;

        // Llenar textareas - Solo si existen
        const listaMatElem = document.getElementById('listaMatutino');
        const listaVespElem = document.getElementById('listaVespertino');
        if (listaMatElem) listaMatElem.value = correosAutorizados.matutino.join('\n');
        if (listaVespElem) listaVespElem.value = correosAutorizados.vespertino.join('\n');

        // Renderizar lista - Función interna verifica si existe el contenedor
        renderizarListaAlumnos(data || []);

        console.log(`\uD83D\uDCE7 Correos cargados: Mat=${correosAutorizados.matutino.length}, Vesp=${correosAutorizados.vespertino.length}`);

    } catch (e) {
        console.error('Error cargando correos:', e);
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
        container.innerHTML = '<div class="empty-state"><span class="empty-icon">\uD83D\uDC65</span><p>No hay alumnos registrados</p></div>';
        return;
    }

    container.innerHTML = alumnos.map(a => generarHTMLAlumno(a)).join('');
}

function generarHTMLAlumno(a) {
    return `
        <div class="alumno-item">
            <span class="alumno-email">${a.email}</span>
            <div class="alumno-actions">
                <span class="badge-turno badge-${a.turno}">${a.turno === 'matutino' ? '\u2600' : '\uD83C\uDF19'} ${a.turno}</span>
                <button class="btn-eliminar" onclick="eliminarAlumno('${a.email}')">\u2715</button>
            </div>
        </div>
    `;
}

async function cargarRegistrosHoy() {
    try {
        const hoy = new Date().toISOString().split('T')[0];

        const { data } = await asistenciaSupabase
            .from('registros')
            .select('*')
            .eq('fecha', hoy)
            .order('timestamp', { ascending: false });

        registrosHoy = data || [];
        renderizarTabla(registrosHoy);
        const totalHoyElem = document.getElementById('totalHoy');
        if (totalHoyElem) totalHoyElem.textContent = registrosHoy.length;

    } catch (e) {
        console.error('Error cargando registros:', e);
    }
}

function renderizarTabla(registros) {
    const tbody = document.getElementById('tablaRegistros');
    const emptyState = document.getElementById('listaVacia');

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
            <td><span class="badge-turno badge-${r.turno}">${r.turno === 'matutino' ? '\u2600' : '\uD83C\uDF19'} ${r.turno}</span></td>
            <td>${r.fecha}</td>
        </tr>
    `).join('');
}

function formatearHora(timestamp) {
    if (!timestamp) return '--:--';
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

async function cargarEstadisticas() {
    try {
        const hoy = new Date().toISOString().split('T')[0];
        const { data } = await asistenciaSupabase
            .from('registros')
            .select('turno')
            .eq('fecha', hoy);  // <--- IMPORTANTE: Filtrar solo por HOY

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
    const filtro = document.getElementById('filtroTurno').value;

    let registrosFiltrados = registrosHoy;
    if (filtro !== 'todos') {
        registrosFiltrados = registrosHoy.filter(r => r.turno === filtro);
    }

    renderizarTabla(registrosFiltrados);
    document.getElementById('totalHoy').textContent = registrosFiltrados.length;
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
        const hoy = new Date().toISOString().split('T')[0];
        const { error } = await asistenciaSupabase
            .from('registros')
            .delete()
            .eq('fecha', hoy);

        if (error) throw error;

        // Reset visual inmediato
        document.getElementById('statMatutino').textContent = '0';
        document.getElementById('statVespertino').textContent = '0';
        document.getElementById('statTotal').textContent = '0';
        document.getElementById('totalHoy').textContent = '0';

        await cargarRegistrosHoy();
        await cargarEstadisticas();
        alert('\u2705 Registros eliminados');

    } catch (e) {
        console.error('Error detallado:', e);
        alert(`Error al eliminar: ${e.message || e.error_description || 'Desconocido'}`);
    }
}

// ===================================
// GESTIÓN DE ALUMNOS
// ===================================

async function agregarAlumnoIndividual() {
    const emailInput = document.getElementById('nuevoCorreo');
    const nombreInput = document.getElementById('nuevoNombre');
    const turnoSelect = document.getElementById('nuevoTurno');

    const email = emailInput.value.toLowerCase().trim();
    const nombre = nombreInput.value.trim();
    const turno = turnoSelect.value;

    if (!email || !email.includes('@')) {
        alert('Ingresa un correo válido');
        return;
    }

    try {
        const { error } = await asistenciaSupabase
            .from('correos_autorizados')
            .insert({
                email: email,
                nombre_alumno: nombre || null,
                turno: turno
            });

        if (error) {
            if (error.code === '23505') {
                alert('Este correo ya está registrado');
            } else {
                throw error;
            }
            return;
        }

        emailInput.value = '';
        nombreInput.value = '';
        await cargarCorreosAutorizados();
        alert('\u2705 Alumno agregado');

    } catch (e) {
        console.error('Error:', e);
        alert('Error al agregar alumno');
    }
}

async function importarListas() {
    const listaMatutino = document.getElementById('listaMatutino').value;
    const listaVespertino = document.getElementById('listaVespertino').value;

    // Procesar correos
    const procesarLista = (texto) => {
        return texto
            .split(/[\n,;]+/)
            .map(e => e.trim().toLowerCase())
            .filter(e => e.length > 3 && e.includes('@'));
    };

    const correosMatutino = procesarLista(listaMatutino);
    const correosVespertino = procesarLista(listaVespertino);

    if (correosMatutino.length === 0 && correosVespertino.length === 0) {
        alert('No hay correos válidos para importar');
        return;
    }

    try {
        // \uD83D\uDD0D VERIFICAR SI YA HAY CORREOS REGISTRADOS
        const { data: existentes } = await asistenciaSupabase
            .from('correos_autorizados')
            .select('*');

        const totalExistentes = existentes ? existentes.length : 0;

        // \u26A0 SI YA HAY CORREOS, MOSTRAR ADVERTENCIA
        if (totalExistentes > 0) {
            const matutinosActuales = existentes.filter(e => e.turno === 'matutino').length;
            const vespertinosActuales = existentes.filter(e => e.turno === 'vespertino').length;

            const confirmarReemplazo = confirm(
                `\u26A0 ADVERTENCIA: Ya tienes correos registrados\n\n` +
                `\uD83D\uDCCA Correos actuales:\n` +
                `   - Matutino: ${matutinosActuales}\n` +
                `   - Vespertino: ${vespertinosActuales}\n` +
                `   - Total: ${totalExistentes}\n\n` +
                `\uD83D\uDD04 Nuevos correos a importar:\n` +
                `   - Matutino: ${correosMatutino.length}\n` +
                `   - Vespertino: ${correosVespertino.length}\n\n` +
                `\u26A0 ESTO ELIMINARÁ TODOS LOS CORREOS ACTUALES\n` +
                `y los reemplazará con los nuevos.\n\n` +
                `¿Estás SEGURO de continuar?`
            );

            if (!confirmarReemplazo) {
                alert('\u274C Importación cancelada. Los correos actuales no fueron modificados.');
                return;
            }

            // Segunda confirmación de seguridad
            const confirmacionFinal = confirm(
                `\uD83D\uDEA8 ÚLTIMA CONFIRMACIÓN\n\n` +
                `Se eliminarán ${totalExistentes} correos existentes.\n\n` +
                `¿Proceder con el reemplazo?`
            );

            if (!confirmacionFinal) {
                alert('\u274C Importación cancelada.');
                return;
            }
        } else {
            // Primera importación - confirmación simple
            if (!confirm(`Se importarán:\n- Matutino: ${correosMatutino.length} correos\n- Vespertino: ${correosVespertino.length} correos\n\n¿Continuar?`)) {
                return;
            }
        }

        // Eliminar correos existentes
        await asistenciaSupabase.from('correos_autorizados').delete().neq('id', 0);

        // Insertar matutino
        if (correosMatutino.length > 0) {
            const dataMat = correosMatutino.map(email => ({
                email: email,
                turno: 'matutino'
            }));
            await asistenciaSupabase.from('correos_autorizados').insert(dataMat);
        }

        // Insertar vespertino
        if (correosVespertino.length > 0) {
            const dataVesp = correosVespertino.map(email => ({
                email: email,
                turno: 'vespertino'
            }));
            await asistenciaSupabase.from('correos_autorizados').insert(dataVesp);
        }

        await cargarCorreosAutorizados();
        alert(`\u2705 Listas actualizadas exitosamente!\n\nMatutino: ${correosMatutino.length}\nVespertino: ${correosVespertino.length}\nTotal: ${correosMatutino.length + correosVespertino.length}`);

    } catch (e) {
        console.error('Error:', e);
        alert('\u274C Error al importar listas. Revisa la consola para más detalles.');
    }
}

async function eliminarAlumno(email) {
    if (!confirm(`¿Eliminar a ${email}?`)) return;

    try {
        await asistenciaSupabase
            .from('correos_autorizados')
            .delete()
            .eq('email', email);

        await cargarCorreosAutorizados();

    } catch (e) {
        console.error('Error:', e);
        alert('Error al eliminar');
    }
}

// ===================================
// CONFIGURACIÓN
// ===================================

async function guardarConfiguracion() {
    const nombre = document.getElementById('configNombre').value.trim();
    const scriptUrl = document.getElementById('configScript').value.trim();

    try {
        // Actualizar o insertar
        const { data: existing } = await asistenciaSupabase
            .from('configuracion')
            .select('id')
            .limit(1)
            .single();

        if (existing) {
            await asistenciaSupabase
                .from('configuracion')
                .update({
                    nombre_sesion: nombre,
                    script_url: scriptUrl,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
        } else {
            await asistenciaSupabase
                .from('configuracion')
                .insert({
                    nombre_sesion: nombre,
                    script_url: scriptUrl
                });
        }

        configuracion.nombre_sesion = nombre;
        configuracion.script_url = scriptUrl;
        document.getElementById('nombreSesion').textContent = nombre;

        alert('\u2705 Configuración guardada');

    } catch (e) {
        console.error('Error:', e);
        alert('Error al guardar configuración');
    }
}

function copiarEnlaceAlumno() {
    const linkInput = document.getElementById('linkAlumno');
    if (!linkInput) return;

    // Seleccionar y copiar
    linkInput.select();
    linkInput.setSelectionRange(0, 99999); // Para móviles

    try {
        navigator.clipboard.writeText(linkInput.value).then(() => {
            alert('\u2705 ¡Enlace copiado al portapapeles!');
        }).catch(err => {
            // Fallback antiguo
            document.execCommand('copy');
            alert('\u2705 ¡Enlace copiado!');
        });
    } catch (err) {
        console.error('Error al copiar:', err);
        alert('No se pudo copiar automáticamente. Por favor selecciónalo manual.');
    }
}

// Inicializar el valor del enlace de alumnos
document.addEventListener('DOMContentLoaded', () => {
    const linkInput = document.getElementById('linkAlumno');
    if (linkInput) {
        // Construir URL absoluta basada en la ubicación actual
        const currentUrl = window.location.href;
        const rootUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'));
        linkInput.value = `${rootUrl}/registro.html`;
    }
});

// Exponer funciones globalmente
window.cambiarTab = cambiarTab;
window.cambiarSubtab = cambiarSubtab;
window.seleccionarTurno = seleccionarTurno;
window.marcarAsistencia = marcarAsistencia;
window.filtrarLista = filtrarLista;
window.exportarCSV = exportarCSV;
window.limpiarRegistros = limpiarRegistros;
window.agregarAlumnoIndividual = agregarAlumnoIndividual;
window.importarListas = importarListas;
window.eliminarAlumno = eliminarAlumno;
window.guardarConfiguracion = guardarConfiguracion;
window.copiarEnlaceAlumno = copiarEnlaceAlumno;
