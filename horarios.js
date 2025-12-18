document.addEventListener('DOMContentLoaded', () => {
    initDragAndDrop();
    initEdicionProfesores();
    // procesarMaterias(); // Ya no coloreamos por JS, usamos CSS fijo
    initCreator(); // Inicializar el panel creador

    // Iniciar BD
    initHorariosDB();
    cargarHorarios();
    initGlobalButtons();
});

function initCreator() {
    const btnAgregar = document.getElementById('btnAgregarMateria');
    const inputMateria = document.getElementById('inputMateria');
    const inputDocente = document.getElementById('inputDocente');
    const banco = document.getElementById('bancoMaterias');

    if (btnAgregar) {
        btnAgregar.addEventListener('click', () => {
            const materia = inputMateria.value.trim();
            const docente = inputDocente.value.trim();

            if (!materia) {
                alert("Por favor escribe el nombre de la materia.");
                return;
            }

            // Crear Tarjeta
            const nuevaCard = document.createElement('div');
            nuevaCard.classList.add('materia-card');
            nuevaCard.setAttribute('draggable', 'true');

            // HTML interno igual al resto
            nuevaCard.innerHTML = `
                <div class="card-asignatura">${materia}</div>
                <div class="card-profesor">${docente || "Sin Asignar"}</div>
            `;

            // Agregar eventos de Drag
            nuevaCard.addEventListener('dragstart', dragStart);
            nuevaCard.addEventListener('dragend', dragEnd);

            // Insertar arriba de la lista
            banco.prepend(nuevaCard);

            // Limpiar inputs
            inputMateria.value = '';
            inputDocente.value = '';
        });
    }
}

function initGlobalButtons() {
    const btnGuardar = document.getElementById('btnGuardar');
    const btnImprimir = document.getElementById('btnImprimir');

    if (btnGuardar) {
        btnGuardar.addEventListener('click', () => {
            // Feedback visual para tranquilidad del usuario
            // (El sistema ya guarda automáticamente cada movimiento)
            const originalText = btnGuardar.innerText;
            btnGuardar.innerText = '⏳ Guardando...';
            btnGuardar.disabled = true;
            // Opcional: cambiar color
            // btnGuardar.style.backgroundColor = '#4CAF50'; 

            setTimeout(() => {
                btnGuardar.innerText = '✅ Guardado';
                setTimeout(() => {
                    btnGuardar.innerText = originalText;
                    btnGuardar.disabled = false;
                }, 1500);
            }, 800);
        });
    }

    if (btnImprimir) {
        btnImprimir.addEventListener('click', () => {
            window.print();
        });
    }
}

function initDragAndDrop() {
    const cards = document.querySelectorAll('.materia-card');
    const dropzones = document.querySelectorAll('.dropzone');
    const banco = document.getElementById('bancoMaterias'); // El banco también puede recibir cards de vuelta si quieres

    cards.forEach(card => {
        card.addEventListener('dragstart', dragStart);
        card.addEventListener('dragend', dragEnd);
    });

    dropzones.forEach(zone => {
        zone.addEventListener('dragover', dragOver);
        zone.addEventListener('dragenter', dragEnter);
        zone.addEventListener('dragleave', dragLeave);
        zone.addEventListener('drop', dragDrop);
    });

    // Opcional: Permitir devolver al banco
    if (banco) {
        banco.addEventListener('dragover', dragOver);
        banco.addEventListener('drop', (e) => {
            e.preventDefault();
            if (draggedCard) {
                banco.appendChild(draggedCard);
                // No registrar historial si vuelve al banco, o sí, depende gusto
            }
        });
    }
}

function initEdicionProfesores() {
    // Delegación de eventos global para que funcione en elementos nuevos dinámicos
    document.addEventListener('dblclick', function (e) {
        if (e.target.classList.contains('card-profesor')) {
            activarEdicion(e.target);
        }
    });
}

function activarEdicion(elemento) {
    const nombreActual = elemento.innerText;
    const input = document.createElement('input');
    input.type = 'text';
    input.value = nombreActual;
    input.className = 'edit-profesor-input';

    elemento.innerHTML = ''; // El ::before se maneja por CSS, así que vaciar HTML está bien, pero ojo si afecta visual
    elemento.appendChild(input);
    input.focus();

    const tarjeta = elemento.closest('.materia-card');
    if (tarjeta) tarjeta.setAttribute('draggable', 'false');

    const confirmarEdicion = () => {
        const nuevoNombre = input.value.trim() || 'Sin Profesor';
        elemento.innerHTML = nuevoNombre;
        if (tarjeta) tarjeta.setAttribute('draggable', 'true');

        // Guardar en BD
        const zona = elemento.closest('.dropzone');
        if (zona) {
            const ctx = obtenerContextoZona(zona);
            const mInfo = obtenerTextoMateria(tarjeta); // Ya tiene el nuevo nombre
            guardarHorarioDB(ctx, mInfo);
            registrarHistorialDB("Edición", `Profesor cambiado a ${nuevoNombre} en ${ctx.dia} ${ctx.hora}`);
        }
    };

    input.addEventListener('blur', confirmarEdicion);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') input.blur();
    });
}

// Variables globales Drag & Drop
let draggedCard = null;
let sourceZone = null;

function dragStart(e) {
    draggedCard = this;
    sourceZone = this.parentNode;
    setTimeout(() => { this.style.opacity = '0.4'; }, 0);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function dragEnd() {
    if (draggedCard) draggedCard.style.opacity = '1';
    draggedCard = null;
    sourceZone = null;
    document.querySelectorAll('.dropzone').forEach(zone => zone.classList.remove('drag-over'));
}

function dragOver(e) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }
function dragEnter(e) { e.preventDefault(); this.classList.add('drag-over'); }
function dragLeave() { this.classList.remove('drag-over'); }

function dragDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over');

    // Si soltamos en el banco (u otro contenedor no dropzone de tabla), ignorar lógica compleja de historial
    if (this.id === 'bancoMaterias') return;

    const targetZone = this;
    if (targetZone === sourceZone) return;

    // Info para Historial
    const materiaInfo = obtenerTextoMateria(draggedCard);
    const infoOrigen = obtenerContextoZona(sourceZone);
    const infoDestino = obtenerContextoZona(targetZone);

    // Movimiento / Swap
    if (targetZone.children.length > 0) {
        // Si hay una carta, hacer SWAP (la de destino va al origen)
        const existingCard = targetZone.children[0];
        sourceZone.appendChild(existingCard);
        targetZone.appendChild(draggedCard);
    } else {
        // Si está vacío, solo mover
        targetZone.appendChild(draggedCard);
    }


    destelloExito(targetZone);
    registrarHistorial(materiaInfo, infoOrigen, infoDestino);

    // Guardar cambios en BD
    // 1. Destino siempre cambia
    guardarHorarioDB(infoDestino, materiaInfo);

    // 2. Si hubo swap, el origen ahora tiene la 'existingCard'
    if (sourceZone && sourceZone.classList.contains('dropzone')) {
        if (sourceZone.children.length > 0) {
            const swappedCard = sourceZone.children[0];
            const infoSwapped = obtenerTextoMateria(swappedCard);
            guardarHorarioDB(infoOrigen, infoSwapped);
        } else {
            // Origen quedó vacío -> Borrar/Null en BD
            guardarHorarioDB(infoOrigen, null);
        }
    } else if (infoOrigen.grupo !== 'Creador') {
        // Estaba en un slot y se movió a otro lugar (aunque no sea swap, si se movió)
        // pero sourceZone ya se cubrió arriba.
        // Si sourceZone NO es dropzone (ej banco), no hacemos nada
    }

    // Persistir historial
    registrarHistorialDB("Movimiento", `${materiaInfo.asignatura} (${materiaInfo.profesor}) de ${infoOrigen.dia} ${infoOrigen.hora} a ${infoDestino.dia} ${infoDestino.hora}`);
}

// --- UTILIDADES ---

function registrarHistorial(materia, origen, destino) {
    const tabla = document.getElementById('tablaHistorial');
    if (!tabla) return;
    const ahora = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
    const fila = document.createElement('tr');

    let grupoTexto = destino.grupo;
    // Highlight si cambia de grupo, opcional

    fila.innerHTML = `
        <td>${ahora}</td>
        <td><strong>${materia.asignatura}</strong><br><small>${materia.profesor}</small></td>
        <td>${grupoTexto}</td>
        <td>${origen.dia} <small>${origen.hora}</small></td>
        <td>${destino.dia} <small>${destino.hora}</small></td>
    `;
    tabla.prepend(fila);
}

function obtenerContextoZona(zona) {
    // Si viene del banco
    if (zona.id === 'bancoMaterias' || zona.closest('#bancoMaterias')) {
        return { dia: 'Banco', hora: 'Nuevo', grupo: 'Creador' };
    }

    const fila = zona.closest('tr');
    const tabla = zona.closest('table');
    const seccion = zona.closest('.turno-section');
    if (!fila || !tabla) return { dia: '?', hora: '?', grupo: '?' };

    const celdaHora = fila.querySelector('.col-hora');
    const horaTexto = celdaHora ? celdaHora.innerText.trim() : '';

    const celdas = Array.from(fila.children);
    const index = celdas.indexOf(zona);
    const encabezados = tabla.querySelectorAll('thead th');
    const diaTexto = encabezados[index] ? encabezados[index].innerText.trim() : `Día ${index}`;

    let grupo = 'General';
    if (seccion) {
        const header = seccion.querySelector('.turno-header');
        if (header) grupo = header.innerText.replace('Grupo ', '').trim();
    }
    return { dia: diaTexto, hora: horaTexto, grupo: grupo };
}

function obtenerTextoMateria(card) {
    const asig = card.querySelector('.card-asignatura');
    const prof = card.querySelector('.card-profesor');
    return { asignatura: asig ? asig.innerText : '?', profesor: prof ? prof.innerText : '' };
}

function destelloExito(element) {
    element.animate([
        { backgroundColor: 'rgba(255, 213, 79, 0.4)' },
        { backgroundColor: '#fff' }
    ], { duration: 300 });
}

// ==========================================
// INTEGRACIÓN SUPABASE (Horarios + Historial)
// ==========================================

let horariosSupabase = null;

function initHorariosDB() {
    // Reusamos la config de auth-config
    if (window.supabase) {
        horariosSupabase = window.supabase.createClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, {
            db: { schema: 'soporte' }
        });
        console.log('📡 Conectado a Supabase (Horarios)');
    } else {
        console.error("❌ No se encontró cliente Supabase SDK");
    }
}

async function cargarHorarios() {
    if (!horariosSupabase) return;

    const { data, error } = await horariosSupabase
        .from('horarios_curso')
        .select('*');

    if (error) {
        console.error("Error cargando horarios:", error);
        return;
    }

    if (!data) return;

    data.forEach(registro => {
        colocarEnTablero(registro);
    });

    console.log(`✅ ${data.length} horarios cargados.`);
    cargarHistorialPrevio();
}

function colocarEnTablero(registro) {
    const zona = encontrarZonaDOM(registro.grupo, registro.dia, registro.hora);
    if (zona) {
        zona.innerHTML = '';
        if (registro.materia) {
            const card = document.createElement('div');
            card.classList.add('materia-card');
            card.setAttribute('draggable', 'true');
            card.innerHTML = `
                <div class="card-asignatura">${registro.materia}</div>
                <div class="card-profesor">${registro.profesor || 'Sin Profesor'}</div>
            `;
            card.addEventListener('dragstart', dragStart);
            card.addEventListener('dragend', dragEnd);
            zona.appendChild(card);
        }
    }
}

async function guardarHorarioDB(ctx, materiaData) {
    if (!horariosSupabase) return;
    if (ctx.grupo === 'Creador' || ctx.dia === 'Banco') return;

    const materia = materiaData ? materiaData.asignatura : null;
    const profesor = materiaData ? materiaData.profesor : null;

    const { error } = await horariosSupabase
        .from('horarios_curso')
        .upsert({
            grupo: ctx.grupo,
            dia: ctx.dia,
            hora: ctx.hora,
            materia: materia,
            profesor: profesor,
            last_updated: new Date()
        }, { onConflict: 'grupo, dia, hora' });

    if (error) console.error("Error guardando horario:", error);
}

async function registrarHistorialDB(accion, detalle) {
    if (!horariosSupabase) return;

    const user = window.getCurrentUser ? window.getCurrentUser() : null;
    const nombreUsuario = user ? user.nombre : 'Usuario';

    const { error } = await horariosSupabase
        .from('historico_movimientos')
        .insert({
            usuario: nombreUsuario,
            accion: accion,
            detalle: detalle,
            tipo: 'Horario'
        });

    if (error) console.error("Error guardando historial:", error);
}

async function cargarHistorialPrevio() {
    const { data, error } = await horariosSupabase
        .from('historico_movimientos')
        .select('*')
        .eq('tipo', 'Horario')
        .order('fecha', { ascending: false })
        .limit(10);

    if (data) {
        const tabla = document.getElementById('tablaHistorial');
        if (!tabla) return;

        [...data].reverse().forEach(mov => {
            const fecha = new Date(mov.fecha).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${fecha}</td>
                <td colspan="4">${mov.detalle} <br><small>Por: ${mov.usuario}</small></td>
            `;
            tabla.prepend(row);
        });
    }
}

function encontrarZonaDOM(grupo, dia, hora) {
    const secciones = document.querySelectorAll('.turno-section');
    let seccionEncontrada = null;

    for (const sec of secciones) {
        const h = sec.querySelector('.turno-header');
        if (h && h.innerText.includes(grupo)) {
            seccionEncontrada = sec;
            break;
        }
    }
    if (!seccionEncontrada) return null;

    const filas = seccionEncontrada.querySelectorAll('tbody tr');
    let filaEncontrada = null;
    for (const fila of filas) {
        const celdaHora = fila.querySelector('.col-hora');
        if (celdaHora && celdaHora.innerText.trim() === hora) {
            filaEncontrada = fila;
            break;
        }
    }
    if (!filaEncontrada) return null;

    const tabla = seccionEncontrada.querySelector('table');
    const headers = tabla.querySelectorAll('thead th');
    let colIndex = -1;
    headers.forEach((th, index) => {
        if (th.innerText.trim() === dia) colIndex = index;
    });

    if (colIndex > -1 && filaEncontrada.children[colIndex]) {
        return filaEncontrada.children[colIndex];
    }
    return null;
}
