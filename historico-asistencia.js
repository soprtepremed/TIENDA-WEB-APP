/**
 * Histórico General de Asistencia - JavaScript
 * 
 * Lógica para consultar y mostrar listas completas de asistencia
 * por turno y semana específica.
 */

// =====================================================
// Configuración
// =====================================================
const SUPABASE_URL = 'https://api.premed.mx';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabaseSoporte = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: 'soporte' }
});

// Variables de estado
let currentData = [];
let availableWeeks = [];

// =====================================================
// Inicialización
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    loadAvailableWeeks(); // Cargar semanas disponibles al iniciar
});

function initEventListeners() {
    document.getElementById('btnConsultar').addEventListener('click', loadAsistenciaData);
    document.getElementById('btnExportExcelGeneral').addEventListener('click', exportToExcel);

    // Recargar semanas si cambia el turno (opcional, por si las semanas difieren entre turnos)
    document.getElementById('turnoSelect').addEventListener('change', loadAvailableWeeks);
}

// =====================================================
// Lógica de Semanas
// =====================================================
async function loadAvailableWeeks() {
    const turno = document.getElementById('turnoSelect').value;
    const semanaSelect = document.getElementById('semanaSelect');

    // Determinar tabla según turno
    const tableName = (turno === 'en_linea')
        ? 'historico_asistencia_en_linea'
        : 'historico_asistencia_presencial';

    semanaSelect.innerHTML = '<option>Cargando...</option>';
    semanaSelect.disabled = true;

    try {
        // Consultar fechas únicas de inicio de semana
        // RPC sería ideal, pero usaremos select distinct simulado obteniendo rango fechas
        const { data, error } = await supabaseSoporte
            .from(tableName)
            .select('fecha_inicio_semana, fecha_fin_semana')
            .order('fecha_inicio_semana', { ascending: false });

        if (error) throw error;

        // Filtrar únicos manualmente (Set)
        const uniqueWeeks = [];
        const seenDates = new Set();

        data.forEach(item => {
            if (!seenDates.has(item.fecha_inicio_semana)) {
                seenDates.add(item.fecha_inicio_semana);
                uniqueWeeks.push(item);
            }
        });

        availableWeeks = uniqueWeeks;
        renderWeekOptions();

    } catch (err) {
        console.error('Error cargando semanas:', err);
        semanaSelect.innerHTML = '<option value="">Error al cargar semanas</option>';
    } finally {
        semanaSelect.disabled = false;
    }
}

function renderWeekOptions() {
    const select = document.getElementById('semanaSelect');
    select.innerHTML = '';

    if (availableWeeks.length === 0) {
        select.innerHTML = '<option value="">No hay registros disponibles</option>';
        return;
    }

    availableWeeks.forEach((week, index) => {
        const option = document.createElement('option');
        option.value = week.fecha_inicio_semana;

        // Formato: "Del 08 al 12 de Diciembre (2025)"
        const label = formatWeekLabel(week.fecha_inicio_semana, week.fecha_fin_semana);
        option.textContent = label;

        // Seleccionar la primera por defecto
        if (index === 0) option.selected = true;

        select.appendChild(option);
    });
}

// =====================================================
// Carga de Datos
// =====================================================
async function loadAsistenciaData() {
    const turno = document.getElementById('turnoSelect').value;
    const fechaInicio = document.getElementById('semanaSelect').value;

    if (!fechaInicio) {
        alert('Por favor selecciona una semana válida.');
        return;
    }

    showLoading(true);

    const tableName = (turno === 'en_linea')
        ? 'historico_asistencia_en_linea'
        : 'historico_asistencia_presencial';

    try {
        let query = supabaseSoporte
            .from(tableName)
            .select('*')
            .eq('fecha_inicio_semana', fechaInicio);

        // Filtro adicional por turno si es presencial (Matutino vs Vespertino)
        if (turno !== 'en_linea') {
            const turnoLabel = turno === 'matutino' ? 'MATUTINO' : 'VESPERTINO';
            query = query.eq('turno', turnoLabel);
        }

        const { data, error } = await query.order('nombre_alumno', { ascending: true });

        if (error) throw error;

        currentData = data;
        renderTable();
        updateSummary();

        // Mostrar resultados
        document.getElementById('initialState').classList.add('hidden');
        document.getElementById('resultsArea').classList.remove('hidden');

    } catch (err) {
        console.error('Error consultando datos:', err);
        alert('Error al cargar la lista de asistencia.');
    } finally {
        showLoading(false);
    }
}

// =====================================================
// Renderizado
// =====================================================
function renderTable() {
    const tbody = document.getElementById('listaAsistenciaBody');
    tbody.innerHTML = '';

    if (currentData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">No se encontraron registros para este criterio.</td></tr>';
        return;
    }

    currentData.forEach(alumno => {
        const row = document.createElement('tr');

        // Calcular porcentaje individual
        const porcentaje = calculateIndividualPercent(alumno);
        const percentClass = getPercentColor(porcentaje);
        const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

        // Construir celdas de días
        const cellsDias = dias.map(dia => {
            const val = alumno[dia]; // Valor original de BD
            const displayVal = val || ''; // Si es null, mostrar vacío
            const colorClass = getStatusColor(displayVal);
            return `<td style="text-align:center; font-size: 0.85rem;" class="${colorClass}">${displayVal}</td>`;
        }).join('');

        row.innerHTML = `
            <td style="font-weight:600; color:#555;">${alumno.id_alumno || '--'}</td>
            <td style="font-weight:600;">${alumno.nombre_alumno || 'Sin nombre'}</td>
            ${cellsDias}
            <td style="text-align:center; font-weight:bold; color:${percentClass}">${porcentaje}%</td>
        `;

        tbody.appendChild(row);
    });
}

function updateSummary() {
    // Total Alumnos
    document.getElementById('statsTotalAlumnos').textContent = currentData.length;

    // Promedio General
    if (currentData.length > 0) {
        const totalPercent = currentData.reduce((acc, curr) => acc + calculateIndividualPercent(curr), 0);
        const avg = Math.round(totalPercent / currentData.length);
        document.getElementById('statsAsistenciaPromedio').textContent = `${avg}%`;
    } else {
        document.getElementById('statsAsistenciaPromedio').textContent = '0%';
    }

    // Etiqueta Semana
    const semanaText = document.getElementById('semanaSelect').options[document.getElementById('semanaSelect').selectedIndex]?.text;
    document.getElementById('statsSemanaLabel').textContent = semanaText || '--';
}

// =====================================================
// Utilidades y Cálculos
// =====================================================
function getStatusColor(status) {
    if (!status) return '';
    const s = status.toUpperCase();

    // Presencial
    if (s === 'ASISTIÓ') return 'bg-presente-soft'; // Verde suave
    if (s === 'NO ASISTIÓ') return 'bg-ausente-soft'; // Rojo suave
    if (s.includes('RETARDO')) return 'bg-retardo-soft'; // Amarillo suave

    // En línea
    if (s === 'ASISTENCIA COMPLETA') return 'bg-presente-soft';
    if (s === 'ASISTENCIA INCOMPLETA') return 'bg-ausente-soft';
    if (s === 'ASISTENCIA PARCIAL') return 'bg-retardo-soft';

    return '';
}

function calculateIndividualPercent(alumno) {
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
    let totalPuntos = 0;

    // Reglas de negocio: 5 días = 100% (20% por día)
    // Asistió/Completa: 100% del día
    // Parcial/Retardo: 50% del día (Ajustable)
    // No/Incompleta: 0%

    // Nota: Si quieres que coincida con lógica anterior (30/70/100):
    // Asistencia Parcial = 70, Incompleta = 30

    dias.forEach(dia => {
        const val = alumno[dia];
        if (!val) return;

        const s = val.toUpperCase();

        if (s === 'ASISTIÓ' || s === 'ASISTENCIA COMPLETA') totalPuntos += 20;
        else if (s === 'ASISTENCIA PARCIAL') totalPuntos += 14; // 70% de 20
        else if (s === 'ASISTENCIA INCOMPLETA') totalPuntos += 6; // 30% de 20
        // No asistió suma 0
    });

    return Math.min(Math.round(totalPuntos), 100);
}

function getPercentColor(percent) {
    if (percent >= 80) return '#15803d'; // Verde
    if (percent >= 50) return '#d97706'; // Naranja
    return '#dc2626'; // Rojo
}

function formatWeekLabel(start, end) {
    if (!start || !end) return 'Semana desconocida';
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');

    const options = { day: 'numeric', month: 'long' };
    const s = startDate.toLocaleDateString('es-MX', options);
    const e = endDate.toLocaleDateString('es-MX', options);

    return `Del ${s} al ${e} (${startDate.getFullYear()})`;
}

function showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    const resultsArea = document.getElementById('resultsArea');
    const initialState = document.getElementById('initialState');

    if (show) {
        loadingState.classList.remove('hidden');
        resultsArea.classList.add('hidden');
        initialState.classList.add('hidden');
    } else {
        loadingState.classList.add('hidden');
    }
}

// =====================================================
// Exportación
// =====================================================
function exportToExcel() {
    if (currentData.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const wb = XLSX.utils.book_new();
    const wsData = [
        ['Histórico de Asistencia General'],
        ['Turno:', document.getElementById('turnoSelect').value.toUpperCase()],
        ['Semana:', document.getElementById('semanaSelect').options[document.getElementById('semanaSelect').selectedIndex].text],
        ['Generado:', new Date().toLocaleString()],
        [''],
        ['ID', 'Nombre', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', '% Asistencia']
    ];

    currentData.forEach(item => {
        wsData.push([
            item.id_alumno,
            item.nombre_alumno,
            item.lunes || '',
            item.martes || '',
            item.miercoles || '',
            item.jueves || '',
            item.viernes || '',
            calculateIndividualPercent(item) + '%'
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, "Asistencia");
    XLSX.writeFile(wb, `Reporte_General_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// =====================================================
// Estilos Dinámicos (Clases de Color)
// =====================================================
const style = document.createElement('style');
style.textContent = `
    .bg-presente-soft { background-color: #f0fdf4; color: #166534; }
    .bg-ausente-soft { background-color: #fef2f2; color: #991b1b; }
    .bg-retardo-soft { background-color: #fffbeb; color: #92400e; }
`;
document.head.appendChild(style);
