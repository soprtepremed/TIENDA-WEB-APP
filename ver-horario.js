document.addEventListener('DOMContentLoaded', () => {
    // Iniciar BD
    initHorariosDB();
    cargarHorarios();
});

// ==========================================
// INTEGRACIÓN SUPABASE (Solo Lectura)
// ==========================================

let horariosSupabase = null;

function initHorariosDB() {
    // Reusamos la config de auth-config (debe estar cargado en el HTML)
    if (window.supabase) {
        horariosSupabase = window.supabase.createClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, {
            db: { schema: 'soporte' }
        });
        console.log('📡 Conectado a Supabase (Modo Lectura)');
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
}

function colocarEnTablero(registro) {
    const zona = encontrarZonaDOM(registro.grupo, registro.dia, registro.hora);
    if (zona) {
        zona.innerHTML = '';
        if (registro.materia) {
            const card = document.createElement('div');
            card.classList.add('materia-card');
            // SIN DRAGGABLE
            // card.setAttribute('draggable', 'true'); 

            // HTML simple
            card.innerHTML = `
                <div class="card-asignatura">${registro.materia}</div>
                <div class="card-profesor">${registro.profesor || 'Sin Profesor'}</div>
            `;

            // SIN EVENT LISTENERS
            // card.addEventListener('dragstart', dragStart); ...

            zona.appendChild(card);
        }
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
