
// ==========================================
// Módulo de Horarios Interactivos
// ==========================================

const SUPABASE_URL = 'https://api.premed.mx';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'; // (Misma key anon que usas en otros archivos)

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    db: { schema: 'soporte' }
});

let currentTurno = 'matutino'; // Default

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    initGrid();
    setupDragAndDropTools();
    changeTurno('matutino'); // Iniciar en turno por defecto
    setupTrashZone();
});

// ==========================================
// 1. Configuración del Grid (Horas)
// ==========================================
function initGrid() {
    const grid = document.getElementById('scheduleGrid');

    // Rango de horas: 7:00 AM a 9:00 PM (21:00)
    const startHour = 7;
    const endHour = 21;
    const days = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

    for (let h = startHour; h < endHour; h++) {
        // Formato Hora (ej: 08:00)
        const hourLabel = `${h.toString().padStart(2, '0')}:00`;
        const hourDisplay = `${h > 12 ? h - 12 : h}:00 ${h >= 12 ? 'PM' : 'AM'}`;

        // Celda de Hora (Columna 1)
        const timeDiv = document.createElement('div');
        timeDiv.className = 'time-cell';
        timeDiv.textContent = hourDisplay;
        grid.appendChild(timeDiv);

        // Celdas de Días (Columnas 2-6)
        days.forEach(day => {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            cell.dataset.dia = day;
            cell.dataset.hora = hourLabel;

            // Eventos de Drop
            cell.addEventListener('dragover', handleDragOver);
            cell.addEventListener('dragleave', handleDragLeave);
            cell.addEventListener('drop', handleDrop);

            grid.appendChild(cell);
        });
    }
}

// ==========================================
// 2. Lógica Drag & Drop (Toolbox)
// ==========================================

function setupDragAndDropTools() {
    const draggables = document.querySelectorAll('.subject-card[draggable="true"]');
    draggables.forEach(drag => {
        drag.addEventListener('dragstart', (e) => {
            // Guardamos los datos de la materia que estamos arrastrando
            e.dataTransfer.setData('text/plain', JSON.stringify({
                materia: drag.dataset.materia,
                color: drag.dataset.color,
                docente: '', // Nuevo: vacío al arrastrar del toolbox
                type: 'new'
            }));
            e.dataTransfer.effectAllowed = 'copy';
        });
    });
}

function handleDragOver(e) {
    e.preventDefault();
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

    // Validar destino
    const destDia = this.dataset.dia;
    const destHora = this.dataset.hora;

    // Si es MOVER y el destino es el mismo
    if (data.type === 'move' && data.originDia === destDia && data.originHora === destHora) {
        return;
    }

    let docenteFinal = data.docente;

    // Si es NUEVA materia, preguntar Docente
    if (data.type === 'new') {
        const inputDocente = prompt(`Asignar docente para ${data.materia}:`, "Sin Asignar");
        if (inputDocente === null) return; // Cancelar
        docenteFinal = inputDocente || "Sin Asignar";
    }

    // 1. Guardar en Destino (Intentar guardar primero valida conflictos)
    const guardadoExitoso = await saveSlotToDb(destDia, destHora, data.materia, data.color, docenteFinal);

    // Si falló (por conflicto), no hacemos nada más
    if (!guardadoExitoso) return;

    // Si tuvo éxito, actualizar visualmente
    renderSlot(this, data.materia, data.color, docenteFinal);

    // 2. Si es MOVER, Borrar del Origen
    if (data.type === 'move') {
        const originCell = document.querySelector(`.grid-cell[data-dia="${data.originDia}"][data-hora="${data.originHora}"]`);
        if (originCell) originCell.innerHTML = '';
        await deleteSlotFromDb(data.originDia, data.originHora);
    }
}

// Helper para pintar una celda
function renderSlot(cellElement, materia, colorClass, docente) {
    cellElement.innerHTML = '';
    const docenteText = docente || 'Sin Docente';

    const slot = document.createElement('div');
    slot.className = `scheduled-class ${colorClass}`;

    // Layout interno con nombre de profe
    slot.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; line-height:1.2;">
            <span style="font-size:0.9rem;">${materia}</span>
            <span style="font-size:0.75rem; opacity:0.9; font-weight:400; margin-top:2px;">👨‍🏫 ${docenteText}</span>
        </div>
        <div class="remove-class">✕</div>
    `;

    slot.draggable = true;

    // Drag start para MOVER
    slot.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', JSON.stringify({
            materia: materia,
            color: colorClass,
            docente: docenteText,
            type: 'move',
            originDia: cellElement.dataset.dia,
            originHora: cellElement.dataset.hora
        }));
    });

    // Click en la X para borrar rápido
    slot.querySelector('.remove-class').addEventListener('click', async (e) => {
        e.stopPropagation();
        if (confirm(`¿Eliminar ${materia} del horario?`)) {
            cellElement.innerHTML = '';
            await deleteSlotFromDb(cellElement.dataset.dia, cellElement.dataset.hora);
            showToast('🗑️ Eliminado');
        }
    });

    cellElement.appendChild(slot);
}

// ==========================================
// 3. Papelera (Eliminar)
// ==========================================
function setupTrashZone() {
    const trash = document.getElementById('trashZone');

    trash.addEventListener('dragover', (e) => {
        e.preventDefault();
        trash.style.backgroundColor = '#fef2f2';
    });

    trash.addEventListener('dragleave', () => {
        trash.style.backgroundColor = '';
    });

    trash.addEventListener('drop', async (e) => {
        e.preventDefault();
        trash.style.backgroundColor = '';

        const data = JSON.parse(e.dataTransfer.getData('text/plain'));

        // Solo eliminar si viene de una celda existente ('move')
        if (data.type === 'move') {
            await deleteSlotFromDb(data.originDia, data.originHora);

            // Borrar visualmente del origen
            const originCell = document.querySelector(`.grid-cell[data-dia="${data.originDia}"][data-hora="${data.originHora}"]`);
            if (originCell) originCell.innerHTML = '';

            showToast('🗑️ Clase eliminada');
        }
    });
}


// ==========================================
// 4. Base de Datos (Supabase)
// ==========================================

async function loadHorario(turno) {
    // Limpiar Grid
    document.querySelectorAll('.grid-cell').forEach(c => c.innerHTML = '');

    const { data, error } = await supabase
        .from('horarios')
        .select('*')
        .eq('turno', turno);

    if (error) {
        console.error('Error cargando horario:', error);
        return;
    }

    data.forEach(item => {
        const cell = document.querySelector(`.grid-cell[data-dia="${item.dia}"][data-hora="${item.hora_inicio}"]`);
        if (cell) {
            renderSlot(cell, item.materia, item.color, item.docente);
        }
    });
}

async function saveSlotToDb(dia, hora, materia, color, docente) {

    // 1. Validar conflictos (Docente)
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
        console.error('Error guardando:', error);
        return false;
    }

    showToast();
    return true;
}

async function deleteSlotFromDb(dia, hora) {
    const { error } = await supabase
        .from('horarios')
        .delete()
        .match({ turno: currentTurno, dia: dia, hora_inicio: hora });

    if (error) console.error('Error eliminando:', error);
}

// ==========================================
// 5. Interfaz y Lógica de Turnos
// ==========================================

function changeTurno(turno) {
    currentTurno = turno;

    // Update Buttons
    document.querySelectorAll('.btn-turno').forEach(btn => btn.classList.remove('active'));

    if (turno === 'matutino') document.getElementById('btnMatutino').classList.add('active');
    else if (turno === 'vespertino_presencial') document.getElementById('btnVespPresencial').classList.add('active');
    else if (turno === 'vespertino_linea') document.getElementById('btnVespLinea').classList.add('active');

    // Recargar datos
    loadHorario(turno);
}

// ==========================================
// 6. Validación de Conflictos (Docente)
// ==========================================

async function checkDocenteAvailability(dia, hora, docente) {
    if (!docente || docente === 'Sin Asignar') return true; // No validar genéricos

    // Verificar si el docente está ocupado en OTRO turno
    const { data, error } = await supabase
        .from('horarios')
        .select('turno, materia')
        .eq('dia', dia)
        .eq('hora_inicio', hora)
        .eq('docente', docente);

    if (error) {
        console.error('Error validando:', error);
        return true;
    }

    // Buscamos si hay ALGÚN registro que no sea el turno actual
    const choque = data.find(r => r.turno !== currentTurno);

    if (choque) {
        alert(`🚫 CONFLICTO DE HORARIO:\n\nEl docente "${docente}" ya está impartiendo "${choque.materia}" en el turno "${choque.turno.toUpperCase()}" a esta hora.`);
        return false;
    }

    return true;
}

function showToast(msg = '💾 Guardado exitosamente') {
    const t = document.getElementById('saveIndicator');
    t.textContent = msg;
    t.classList.add('visible');
    setTimeout(() => t.classList.remove('visible'), 2000);
}
