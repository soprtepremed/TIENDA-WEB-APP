
// ==========================================
// Módulo de Horarios Interactivos v2.0
// ==========================================

const SUPABASE_URL = 'https://api.premed.mx';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    db: { schema: 'soporte' }
});

let currentTurno = 'matutino';

// Configuración de Horas Exactas por Turno
const CONFIG_HORARIOS = {
    matutino: { start: 9, end: 13 },            // 9 a 13
    vespertino_presencial: { start: 16, end: 20 }, // 16 a 20
    vespertino_linea: { start: 15, end: 19 }    // 15 a 19
};

document.addEventListener('DOMContentLoaded', () => {
    setupDragAndDropTools(); // Configurar eventos de las materias disponibles
    setupTrashZone();        // Configurar papelera
    changeTurno('matutino'); // Iniciar
});

// ==========================================
// 1. Construcción del Grid Dinámico
// ==========================================
function initGrid(turno) {
    const grid = document.getElementById('scheduleGrid');
    grid.innerHTML = ''; // Limpiar todo (incluyendo headers)

    // 1. Recrear Headers
    const headers = ['Hora', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
    headers.forEach(text => {
        const div = document.createElement('div');
        div.className = 'grid-header';
        div.textContent = text;
        grid.appendChild(div);
    });

    // 2. Definir rango de horas
    const config = CONFIG_HORARIOS[turno] || { start: 8, end: 18 };
    const startHour = config.start;
    const endHour = config.end;
    const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

    // 3. Generar Filas
    for (let h = startHour; h < endHour; h++) {
        // Rango de la clase (Ej: 09:00 - 10:00)
        const horaInicio = `${h.toString().padStart(2, '0')}:00`;
        const horaFin = `${(h + 1).toString().padStart(2, '0')}:00`;

        // Formato AM/PM para mostrar
        const displayStart = formatHour(h);
        const displayEnd = formatHour(h + 1);
        const label = `${displayStart} - ${displayEnd}`;

        // Columna Hora
        const timeDiv = document.createElement('div');
        timeDiv.className = 'time-cell';
        timeDiv.textContent = label;
        grid.appendChild(timeDiv);

        // Columnas Días
        days.forEach(day => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.dia = day;
            cell.dataset.hora = horaInicio; // Guardamos solo la hora de inicio como ID

            // IMPORTANTE: Conectar eventos de Drop aquí mismo
            cell.addEventListener('dragover', handleDragOver);
            cell.addEventListener('dragleave', handleDragLeave);
            cell.addEventListener('drop', handleDrop);

            grid.appendChild(cell);
        });
    }
}

function formatHour(h) {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h > 12 ? h - 12 : h;
    return `${hour12}:00 ${ampm}`;
}


// ==========================================
// 2. Lógica Drag & Drop
// ==========================================

function setupDragAndDropTools() {
    const draggables = document.querySelectorAll('.subject-card'); // Quitamos [draggable="true"] del selector para ser más generosos, pero aseguramos en HTML

    draggables.forEach(drag => {
        // Asegurar atributo
        drag.setAttribute('draggable', 'true');

        drag.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', JSON.stringify({
                materia: drag.dataset.materia,
                color: drag.dataset.color,
                type: 'new',
                docente: ''
            }));
            e.dataTransfer.effectAllowed = 'copy';
            drag.style.opacity = '0.5';
        });

        drag.addEventListener('dragend', (e) => {
            drag.style.opacity = '1';
        });
    });
}

function handleDragOver(e) {
    e.preventDefault(); // OBLIGATORIO para permitir drop
    e.dataTransfer.dropEffect = 'copy';
    this.classList.add('drag-over');
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

async function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');

    const dataRaw = e.dataTransfer.getData('text/plain');
    if (!dataRaw) return;

    const data = JSON.parse(dataRaw);
    const destDia = this.dataset.dia;
    const destHora = this.dataset.hora;

    // Validación Básica: Mismo lugar
    if (data.type === 'move' && data.originDia === destDia && data.originHora === destHora) return;

    let docenteFinal = data.docente;

    // Si es NUEVA, pedir docente
    if (data.type === 'new') {
        docenteFinal = prompt(`Profesor para ${data.materia}:`, "") || "Sin Asignar";
    }

    // 1. Guardar en BD (Validando duplicados docentes)
    const success = await saveSlotToDb(destDia, destHora, data.materia, data.color, docenteFinal);
    if (!success) return; // Si hay conflicto, abortar

    // 2. Renderizar
    renderSlot(this, data.materia, data.color, docenteFinal);

    // 3. Borrar origen si es movimiento
    if (data.type === 'move') {
        const originCell = document.querySelector(`.grid-cell[data-dia="${data.originDia}"][data-hora="${data.originHora}"]`);
        if (originCell) originCell.innerHTML = '';
        await deleteSlotFromDb(data.originDia, data.originHora);
    }
}

function renderSlot(cell, materia, color, docente) {
    cell.innerHTML = ''; // Limpiar

    const div = document.createElement('div');
    div.className = `scheduled-class ${color}`;
    div.draggable = true;

    // Contenido
    div.innerHTML = `
        <div class="class-content">
            <span class="materia-name">${materia}</span>
            <span class="docente-name">👨‍🏫 ${docente}</span>
        </div>
        <div class="remove-btn">✕</div>
    `;

    // Eventos del Elemento Agendado (Para moverlo después)
    div.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
            materia: materia,
            color: color,
            docente: docente,
            type: 'move',
            originDia: cell.dataset.dia,
            originHora: cell.dataset.hora
        }));
        e.dataTransfer.effectAllowed = 'move';
        div.style.opacity = '0.5';
    });

    div.addEventListener('dragend', () => div.style.opacity = '1');

    // Botón Eliminar
    div.querySelector('.remove-btn').addEventListener('click', async (e) => {
        e.stopPropagation(); // No activar drag del padre
        if (confirm('¿Eliminar esta clase?')) {
            cell.innerHTML = '';
            await deleteSlotFromDb(cell.dataset.dia, cell.dataset.hora);
        }
    });

    cell.appendChild(div);
}

// ==========================================
// 3. Gestión de Datos y Validación
// ==========================================

async function loadHorario(turno) {
    // Las celdas ya están limpias porque initGrid las recreó.
    // Solo fetching y pintar.

    const { data, error } = await supabase
        .from('horarios')
        .select('*')
        .eq('turno', turno);

    if (error) { console.error(error); return; }

    data.forEach(item => {
        // Encontrar celda correspondiente
        const cell = document.querySelector(`.grid-cell[data-dia="${item.dia}"][data-hora="${item.hora_inicio}"]`);
        if (cell) {
            renderSlot(cell, item.materia, item.color, item.docente);
        }
    });
}

async function saveSlotToDb(dia, hora, materia, color, docente) {
    // 1. Validar Choque de Docente
    const startCheck = performance.now();
    const libre = await checkDocenteAvailability(dia, hora, docente);
    if (!libre) return false;

    // 2. Guardar
    const { error } = await supabase
        .from('horarios')
        .upsert({
            turno: currentTurno,
            dia: dia,
            hora_inicio: hora,
            materia: materia,
            docente: docente,
            color: color
        }, { onConflict: 'turno,dia,hora_inicio' });

    if (error) {
        console.error('Error DB:', error);
        alert('Error guardando en base de datos.');
        return false;
    }

    showToast();
    return true;
}

async function deleteSlotFromDb(dia, hora) {
    const { error } = await supabase.from('horarios').delete().match({
        turno: currentTurno, dia: dia, hora_inicio: hora
    });
}

async function checkDocenteAvailability(dia, hora, docente) {
    if (!docente || docente === 'Sin Asignar') return true;

    // Buscar conflictos en OTROS turnos para ese docente
    const { data } = await supabase
        .from('horarios')
        .select('turno, materia')
        .eq('dia', dia)
        .eq('hora_inicio', hora)
        .eq('docente', docente);

    if (data && data.length > 0) {
        // Si encuentro registros, verificar que NO sean el turno actual
        // (Aunque el upsert maneja el borrado lógico del mismo slot, aquí protegemos clonación entre turnos)
        const choque = data.find(d => d.turno !== currentTurno);
        if (choque) {
            alert(`⚠️ CONFLICTO:\nEl docente ${docente} ya tiene clase de "${choque.materia}" en el turno ${choque.turno.toUpperCase()}.\n\nNo puede asignarse aquí.`);
            return false;
        }
    }
    return true;
}

// ==========================================
// 4. Utilidades UI
// ==========================================

function changeTurno(turno) {
    currentTurno = turno;

    // UI Botones
    document.querySelectorAll('.btn-turno').forEach(btn => btn.classList.remove('active'));

    if (turno === 'matutino') document.getElementById('btnMatutino').classList.add('active');
    else if (turno === 'vespertino_presencial') document.getElementById('btnVespPresencial').classList.add('active');
    else if (turno === 'vespertino_linea') document.getElementById('btnVespLinea').classList.add('active');

    // 1. Reconstruir Grid (Horas correctas)
    initGrid(turno);

    // 2. Cargar Datos
    loadHorario(turno);
}

function setupTrashZone() {
    const trash = document.getElementById('trashZone');
    trash.addEventListener('dragover', e => {
        e.preventDefault();
        trash.style.borderColor = '#ef4444';
        trash.style.backgroundColor = '#fef2f2';
    });
    trash.addEventListener('dragleave', () => {
        trash.style.borderColor = '#e2e8f0';
        trash.style.backgroundColor = 'white';
    });
    trash.addEventListener('drop', async e => {
        e.preventDefault();
        trash.style.borderColor = '#e2e8f0';
        trash.style.backgroundColor = 'white';

        const data = JSON.parse(e.dataTransfer.getData('text/plain'));
        if (data.type === 'move') {
            await deleteSlotFromDb(data.originDia, data.originHora);
            loadHorario(currentTurno); // Refrescar para asegurar limpieza
            showToast('🗑️ Eliminado');
        }
    });
}

function showToast(text = 'Guardado') {
    const t = document.getElementById('saveIndicator');
    t.innerText = text;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 2000);
}
