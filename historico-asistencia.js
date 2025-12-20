/**
 * Histórico General de Asistencia - JavaScript (Versión Interactiva)
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
let selectedTurno = 'matutino'; // Valor defecto
let selectedSemana = null;

// =====================================================
// Inicialización
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    initEventListeners();
    // Cargar semanas del turno por defecto al iniciar
    loadAvailableWeeks();

    // Listener para mostrar nombre del archivo
    const fileInput = document.getElementById('csvFileInput');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const fileName = e.target.files[0] ? e.target.files[0].name : 'Haga clic o arrastre un archivo CSV aquí';
            document.getElementById('fileNameDisplay').textContent = fileName;
        });
    }
});

function initEventListeners() {
    // El botón consultar ya no existe, es automático
    // document.getElementById('btnConsultar').addEventListener('click', loadAsistenciaData);
    document.getElementById('btnExportExcelGeneral').addEventListener('click', exportToExcel);
}

// =====================================================
// Lógica de Interacción (Turnos y Semanas)
// =====================================================

// Seleccionar turno (Click en botón grande)
window.selectTurno = function (turno) {
    selectedTurno = turno;
    selectedSemana = null; // Resetear semana seleccionada

    // Actualizar UI Botones
    document.querySelectorAll('.btn-turno').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.turno === turno) btn.classList.add('active');
    });

    // Ocultar resultados previos
    document.getElementById('resultsArea').classList.add('hidden');
    document.getElementById('weeksContainer').innerHTML = '<div class="weeks-empty">Cargando semanas...</div>';

    // Cargar nuevas semanas
    loadAvailableWeeks();
}

// Lógica de Tabs Principales
window.switchMainTab = function (tab) {
    // 1. Alternar botones
    document.getElementById('tabConsultar').classList.remove('active');
    document.getElementById('tabCargar').classList.remove('active');

    if (tab === 'consultar') {
        document.getElementById('tabConsultar').classList.add('active');
        document.getElementById('sectionConsultar').classList.remove('hidden');
        document.getElementById('sectionCargar').classList.add('hidden');
    } else {
        document.getElementById('tabCargar').classList.add('active');
        document.getElementById('sectionCargar').classList.remove('hidden');
        document.getElementById('sectionConsultar').classList.add('hidden');
    }
}

// =====================================================
// Lógica de Carga CSV
// =====================================================
window.processCSVUpload = async function () {
    const fileInput = document.getElementById('csvFileInput');
    const logArea = document.getElementById('uploadLog');
    const targetTable = document.getElementById('uploadTarget').value; // 'presencial' o 'en_linea'
    const btnProcesar = document.getElementById('btnProcessUpload');

    const log = (msg, type = 'info') => {
        const color = type === 'error' ? '#ef4444' : type === 'success' ? '#10b981' : '#fbbf24';
        logArea.innerHTML += `<div style="color:${color}; margin-top:2px;">> ${msg}</div>`;
        logArea.scrollTop = logArea.scrollHeight;
    };

    if (fileInput.files.length === 0) {
        alert('Por favor selecciona un archivo CSV.');
        return;
    }

    const file = fileInput.files[0];
    const tableName = targetTable === 'en_linea' ? 'historico_asistencia_en_linea' : 'historico_asistencia_presencial';

    log(`Iniciando carga de archivo: ${file.name}`, 'info');
    log(`Destino: ${tableName}`, 'info');

    btnProcesar.disabled = true;
    btnProcesar.innerText = 'Procesando...';
    document.getElementById('uploadLog').classList.remove('hidden');

    const reader = new FileReader();

    reader.onload = async function (e) {
        const text = e.target.result;
        try {
            const rows = parseCSVSimple(text);
            log(`Filas detectadas: ${rows.length}`, 'info');

            if (rows.length === 0) {
                throw new Error('El archivo parece estar vacío o no tiene el formato correcto.');
            }

            // Validar columnas requeridas
            const requiredCols = ['fecha_inicio_semana', 'id_alumno', 'nombre_alumno', 'turno'];
            const header = Object.keys(rows[0]);
            const missing = requiredCols.filter(col => !header.includes(col));

            if (missing.length > 0) {
                throw new Error(`Faltan columnas requeridas: ${missing.join(', ')}`);
            }

            // Lotes de 100 para no saturar
            const BATCH_SIZE = 100;
            let insertedCount = 0;
            let updatedCount = 0;
            let errorCount = 0;

            log(`Comenzando inserción en lotes de ${BATCH_SIZE}...`, 'info');

            for (let i = 0; i < rows.length; i += BATCH_SIZE) {
                const batch = rows.slice(i, i + BATCH_SIZE);


                // Mapeo inteligente con columnas permitidas
                const cleanBatch = batch.map(row => {
                    const cleanRow = {};

                    // Mapa de sinónimos comunes (LowerCase -> DB Column)
                    const headerMap = {
                        'matricula': 'id_alumno',
                        'control': 'id_alumno',
                        'numero': 'id_alumno',
                        'id': 'id_alumno',
                        'alumno': 'nombre_alumno',
                        'nombre': 'nombre_alumno',
                        'nombre completo': 'nombre_alumno',
                        'estudiante': 'nombre_alumno',
                        'semana': 'fecha_inicio_semana',
                        'fecha inicio': 'fecha_inicio_semana',
                        'inicio': 'fecha_inicio_semana',
                        'fecha': 'fecha_inicio_semana',
                        'fin': 'fecha_fin_semana',
                        'fecha fin': 'fecha_fin_semana',
                        'lun': 'lunes',
                        'mar': 'martes',
                        'mie': 'miercoles',
                        'mié': 'miercoles',
                        'mir': 'miercoles', // typo comun
                        'jue': 'jueves',
                        'vie': 'viernes',
                        'turn': 'turno',
                        'modalidad': 'turno'
                    };

                    // Lista oficial de columnas DB
                    const DB_COLUMNS = [
                        'fecha_inicio_semana', 'fecha_fin_semana', 'id_alumno',
                        'nombre_alumno', 'turno', 'lunes', 'martes',
                        'miercoles', 'jueves', 'viernes'
                    ];

                    // Iterar sobre las keys del row del CSV
                    Object.keys(row).forEach(csvKey => {
                        const val = row[csvKey];
                        // Normalizar key del CSV
                        const normKey = csvKey.toLowerCase().trim().replace(/_/g, ' ');

                        // 1. Match Exacto
                        if (DB_COLUMNS.includes(normKey.replace(/ /g, '_'))) {
                            cleanRow[normKey.replace(/ /g, '_')] = (val || '').trim() || null;
                            return;
                        }

                        // 2. Match por Sinónimos
                        if (headerMap[normKey]) {
                            const dbCol = headerMap[normKey];
                            // Priorizar si ya existe valor (no sobrescribir con nulos si hay duplicados raros)
                            if (!cleanRow[dbCol]) {
                                cleanRow[dbCol] = (val || '').trim() || null;
                            }
                            return;
                        }

                        // 3. Match Parcial (e.g. "Nombre del Alumno" -> contiene "nombre" y "alumno")
                        // Esto es mas arriesgado, mejor nos quedamos con sinónimos directos y exactos para no falsear datos.
                    });

                    // Rellenar turno si falta y lo tenemos en el contexto global (opcional, pero útil)
                    if (!cleanRow['turno']) {
                        // Podríamos inferirlo del select 'uploadTarget', pero el CSV debería traerlo idealmente
                        // Opcional: cleanRow['turno'] = targetTable.includes('en_linea') ? 'En Línea' : 'Matutino';
                    }


                    return cleanRow;
                });

                // ============================================================
                // LÓGICA DE UPSERT MANUAL (Actualizar si existe)
                // ============================================================
                // 1. Buscar registros existentes que coincidan con (id_alumno + semana)
                const weeksInBatch = [...new Set(cleanBatch.map(r => r.fecha_inicio_semana).filter(Boolean))];
                const idsInBatch = cleanBatch.map(r => r.id_alumno).filter(Boolean);

                if (weeksInBatch.length > 0 && idsInBatch.length > 0) {
                    const { data: existingRows, error: fetchError } = await supabaseSoporte
                        .from(tableName)
                        .select('id, id_alumno, fecha_inicio_semana')
                        .in('fecha_inicio_semana', weeksInBatch)
                        .in('id_alumno', idsInBatch);

                    if (!fetchError && existingRows) {
                        // Crear mapa de búsqueda: "ID_ALUMNO|FECHA" -> ID_DB
                        const existingMap = {};
                        existingRows.forEach(row => {
                            const key = `${row.id_alumno}|${row.fecha_inicio_semana}`;
                            existingMap[key] = row.id;
                        });

                        // 2. Inyectar 'id' a los registros que ya existen para forzar UPDATE
                        cleanBatch.forEach(row => {
                            const key = `${row.id_alumno}|${row.fecha_inicio_semana}`;
                            if (existingMap[key]) {
                                row.id = existingMap[key]; // Habilita update por PK
                            }
                        });
                    }
                }

                // 3. Ejecutar Upsert (Sin onConflict explícito, usa PK 'id')
                const { data, error } = await supabaseSoporte
                    .from(tableName)
                    .upsert(cleanBatch);

                if (error) {
                    log(`Error en lote ${i / BATCH_SIZE + 1}: ${error.message}`, 'error');
                    errorCount += batch.length;
                } else {
                    insertedCount += batch.length;
                    log(`Lote ${i / BATCH_SIZE + 1} procesado (${batch.length} registros).`, 'success');
                }
            }

            log(`FINALIZADO. Procesados: ${insertedCount} | Errores: ${errorCount}`, 'success');
            alert(`Carga completada.\nRegistros procesados: ${insertedCount}\nErrores: ${errorCount}`);

        } catch (err) {
            log(`Error Crítico: ${err.message}`, 'error');
            console.error(err);
            alert('Error al procesar el archivo. Revisa el log para más detalles.');
        } finally {
            btnProcesar.disabled = false;
            btnProcesar.innerText = '▶ Procesar y Cargar';
        }
    };

    reader.readAsText(file);
}

// Parser CSV Simple (Soporta comillas básicas)
function parseCSVSimple(str) {
    const arr = [];
    let quote = false;  // 'true' means we're inside a quoted field

    // Iterate over each character, keep track of current row and field (col)
    let row = 0, col = 0, c = 0;
    let data = [''];  // Array of parsed rows (array of strings)

    // 1. Dividir líneas (Respetando saltos de línea dentro de comillas si es posible, 
    // pero para este caso simple asumiremos split por \n y manejo básico)
    // Mejor usaremos un parser línea a línea más robusto

    const lines = str.split(/\r\n|\n/);
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Regex para splitear por comas ignorando las que están dentro de comillas
        // Fuente común de regex para CSV
        // Nota: Esto es básico.
        const values = [];
        let currentVal = '';
        let inQuotes = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];

            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentVal.replace(/^"|"$/g, '')); // Limpiar comillas envolventes
                currentVal = '';
            } else {
                currentVal += char;
            }
        }
        values.push(currentVal.replace(/^"|"$/g, '')); // Push último valor

        // Mapear headers a valores
        if (values.length > 0) {
            const rowObj = {};
            headers.forEach((h, index) => {
                rowObj[h] = values[index] || null;
            });
            arr.push(rowObj);
        }
    }
    return arr;
}


// Seleccionar semana (Click en "píldora")
window.selectSemana = function (fechaInicio, elemento) {
    selectedSemana = fechaInicio;

    // Actualizar UI Píldoras
    document.querySelectorAll('.week-card').forEach(card => card.classList.remove('active'));
    elemento.classList.add('active');

    // Cargar datos AUTOMÁTICAMENTE
    loadAsistenciaData();
}

// =====================================================
// Lógica de Carga de Semanas
// =====================================================
async function loadAvailableWeeks() {
    const tableName = (selectedTurno === 'en_linea')
        ? 'historico_asistencia_en_linea'
        : 'historico_asistencia_presencial';

    try {
        // Consultar rango de semanas FILTRANDO POR TURNO
        let query = supabaseSoporte
            .from(tableName)
            .select('fecha_inicio_semana, fecha_fin_semana');

        // Aplicar filtro de turno si es tabla presencial
        if (selectedTurno !== 'en_linea') {
            // CORRECCIÓN: Usar Capitalizado (Matutino/Vespertino) para coincidir con BD real
            const turnoLabel = selectedTurno === 'matutino' ? 'Matutino' : 'Vespertino';
            query = query.eq('turno', turnoLabel);
        }

        const { data, error } = await query.order('fecha_inicio_semana', { ascending: false });


        if (error) throw error;

        // Filtrar únicos
        const uniqueWeeks = [];
        const seenDates = new Set();

        data.forEach(item => {
            if (!seenDates.has(item.fecha_inicio_semana)) {
                seenDates.add(item.fecha_inicio_semana);
                uniqueWeeks.push(item);
            }
        });

        availableWeeks = uniqueWeeks;
        renderWeekChips();

    } catch (err) {
        console.error('Error cargando semanas:', err);
        document.getElementById('weeksContainer').innerHTML = '<div class="weeks-empty">Error al cargar semanas</div>';
    }
}

function renderWeekChips() {
    const container = document.getElementById('weeksContainer');
    container.innerHTML = '';

    if (availableWeeks.length === 0) {
        container.innerHTML = '<div class="weeks-empty">No hay semanas registradas para este turno</div>';
        return;
    }

    availableWeeks.forEach(week => {
        // Formato Chip: "13-17 oct"
        const label = formatChipLabel(week.fecha_inicio_semana, week.fecha_fin_semana);

        const chip = document.createElement('div');
        chip.className = 'week-card';
        chip.textContent = label;
        chip.onclick = () => window.selectSemana(week.fecha_inicio_semana, chip);

        container.appendChild(chip);
    });
}

// Formato compacto: "09-12 dic"
function formatChipLabel(start, end) {
    if (!start || !end) return 'S/F';

    // Parsear fechas asumiendo YYYY-MM-DD
    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T00:00:00');

    const dayStart = startDate.getDate().toString().padStart(2, '0');
    const dayEnd = endDate.getDate().toString().padStart(2, '0');

    // Obtener mes corto (ej. "dic")
    const monthName = startDate.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '');

    return `${dayStart}-${dayEnd} ${monthName}`;
}

// Formato Largo para el resumen: "Del 09 al 12 de Diciembre (2025)"
function formatFullLabel(start) {
    const week = availableWeeks.find(w => w.fecha_inicio_semana === start);
    if (!week) return start;

    const startDate = new Date(week.fecha_inicio_semana + 'T00:00:00');
    const endDate = new Date(week.fecha_fin_semana + 'T00:00:00');

    const options = { day: 'numeric', month: 'long' };
    return `Del ${startDate.toLocaleDateString('es-MX', options)} al ${endDate.toLocaleDateString('es-MX', options)} (${startDate.getFullYear()})`;
}

// =====================================================
// Carga de Datos (Tabla)
// =====================================================
async function loadAsistenciaData() {
    if (!selectedSemana) return;

    showLoading(true);

    const tableName = (selectedTurno === 'en_linea')
        ? 'historico_asistencia_en_linea'
        : 'historico_asistencia_presencial';

    try {
        let query = supabaseSoporte
            .from(tableName)
            .select('*')
            .eq('fecha_inicio_semana', selectedSemana);

        if (selectedTurno !== 'en_linea') {
            // CORRECCIÓN: Usar Capitalizado para coincidir con la vista SQL
            const turnoLabel = selectedTurno === 'matutino' ? 'Matutino' : 'Vespertino';
            query = query.eq('turno', turnoLabel);
        }

        const { data, error } = await query.order('nombre_alumno', { ascending: true });

        if (error) throw error;

        currentData = data;
        renderTable();
        updateSummary();

        document.getElementById('resultsArea').classList.remove('hidden');

    } catch (err) {
        console.error('Error consultando datos:', err);
        alert('Error al cargar la lista.');
    } finally {
        showLoading(false);
    }
}

// =====================================================
// Renderizado Tabla
// =====================================================
function renderTable() {
    const tbody = document.getElementById('listaAsistenciaBody');
    tbody.innerHTML = '';

    if (currentData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 40px; color: #666;">No se encontraron alumnos para esta semana.</td></tr>';
        return;
    }

    currentData.forEach(alumno => {
        const row = document.createElement('tr');
        const porcentaje = calculateIndividualPercent(alumno);
        const percentClass = getPercentColor(porcentaje);
        const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

        const cellsDias = dias.map(dia => {
            const val = alumno[dia];
            const displayVal = val || '';
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
    document.getElementById('statsTotalAlumnos').textContent = currentData.length;

    if (currentData.length > 0) {
        const totalPercent = currentData.reduce((acc, curr) => acc + calculateIndividualPercent(curr), 0);
        const avg = Math.round(totalPercent / currentData.length);
        document.getElementById('statsAsistenciaPromedio').textContent = `${avg}%`;
    } else {
        document.getElementById('statsAsistenciaPromedio').textContent = '0%';
    }

    document.getElementById('statsSemanaLabel').textContent = formatFullLabel(selectedSemana);
}

// =====================================================
// Utilidades (Colores y Cálculos)
// =====================================================
function getStatusColor(status) {
    if (!status) return '';
    const s = status.toUpperCase();

    if (s === 'ASISTIÓ' || s === 'ASISTENCIA COMPLETA') return 'bg-presente-soft';
    if (s === 'NO ASISTIÓ' || s === 'ASISTENCIA INCOMPLETA') return 'bg-ausente-soft';
    if (s.includes('RETARDO') || s === 'ASISTENCIA PARCIAL') return 'bg-retardo-soft';
    return '';
}

function calculateIndividualPercent(alumno) {
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
    let totalPuntos = 0;

    dias.forEach(dia => {
        const val = alumno[dia];
        if (!val) return;
        const s = val.toUpperCase();

        if (s === 'ASISTIÓ' || s === 'ASISTENCIA COMPLETA') totalPuntos += 20;
        else if (s === 'ASISTENCIA PARCIAL') totalPuntos += 14;
        else if (s === 'ASISTENCIA INCOMPLETA') totalPuntos += 6;
        else if (s.includes('RETARDO')) totalPuntos += 16; // Retardo vale un poco menos que asistencia
    });

    return Math.min(Math.round(totalPuntos), 100);
}

function getPercentColor(percent) {
    if (percent >= 80) return '#15803d';
    if (percent >= 50) return '#d97706';
    return '#dc2626';
}

function showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    if (show) loadingState.classList.remove('hidden');
    else loadingState.classList.add('hidden');
}

// =====================================================
// Exportación Excel
// =====================================================
function exportToExcel() {
    if (currentData.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const wb = XLSX.utils.book_new();
    const wsData = [
        ['Histórico de Asistencia General'],
        ['Turno:', selectedTurno.toUpperCase()],
        ['Semana:', formatFullLabel(selectedSemana)],
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
    XLSX.writeFile(wb, `Reporte_${selectedTurno}_${selectedSemana}.xlsx`);
}

// Estilos Dinámicos
const style = document.createElement('style');
style.textContent = `
    .bg-presente-soft { background-color: #f0fdf4; color: #166534; }
    .bg-ausente-soft { background-color: #fef2f2; color: #991b1b; }
    .bg-retardo-soft { background-color: #fffbeb; color: #92400e; }
`;
document.head.appendChild(style);


// =====================================================
// Funcionalidad: Alumnos en Riesgo (>3 Inasistencias)
// =====================================================

window.showRiskModal = function () {
    const riskStudents = [];
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

    // 1. Filtrar alumnos con más de 3 faltas
    currentData.forEach(alumno => {
        let faltas = 0;

        dias.forEach(dia => {
            const val = (alumno[dia] || '').toUpperCase();

            // Criterios de "Presencia" (NO cuentan como falta)
            const isPresent = val === 'ASISTIÓ' || val === 'RETARDO' ||
                val === 'ASISTENCIA COMPLETA' || val === 'ASISTENCIA PARCIAL';

            // Si NO está presente, es falta (Incluye vacíos/null, 'NO ASISTIÓ', 'NO APROBADO', etc.)
            if (!isPresent) {
                faltas++;
            }
        });

        // CRITERIO: Más de 3 faltas (es decir, 4 o 5)
        if (faltas > 3) {
            riskStudents.push({
                ...alumno,
                totalFaltas: faltas,
                percent: calculateIndividualPercent(alumno)
            });
        }
    });

    // 2. Llenar tabla del modal
    const tbody = document.getElementById('riskTableBody');
    tbody.innerHTML = '';

    if (riskStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 20px;">🎉 ¡Excelente! No hay alumnos en riesgo crítico esta semana.</td></tr>';
    } else {
        // Ordenar por número de faltas (mayor a menor)
        riskStudents.sort((a, b) => b.totalFaltas - a.totalFaltas);

        riskStudents.forEach(st => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="font-weight:600;">${st.id_alumno || '--'}</td>
                <td>${st.nombre_alumno}</td>
                <td style="text-align:center; color:#dc2626; font-weight:bold;">${st.totalFaltas}</td>
                <td style="text-align:center;">${st.percent}%</td>
            `;
            tbody.appendChild(row);
        });
    }

    // 3. Mostrar modal
    const modal = document.getElementById('riskModal');
    if (modal) modal.classList.remove('hidden');
}

window.closeRiskModal = function () {
    const modal = document.getElementById('riskModal');
    if (modal) modal.classList.add('hidden');
}

// Cerrar modal al hacer clic fuera (Delegate event o attach directo si existe)
setTimeout(() => {
    const modal = document.getElementById('riskModal');
    if (modal) {
        modal.addEventListener('click', function (e) {
            if (e.target === this) closeRiskModal();
        });
    }
}, 1000);
