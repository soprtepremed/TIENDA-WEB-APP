/**
 * Reportes de Asistencia y Evaluaciones - JavaScript
 * 
 * Este módulo maneja la búsqueda de alumnos y la visualización de sus
 * historiales de asistencia y evaluaciones.
 */

// =====================================================
// Configuración de Supabase
// =====================================================
const SUPABASE_URL = 'https://api.premed.mx';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

// Cliente para esquema 'soporte' (historial de asistencia)
const supabaseSoporte = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: 'soporte' }
});

// Cliente para esquema 'premed' (datos de alumnos) - Solo para referencia futura
const supabasePremed = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: 'premed' }
});

// =====================================================
// Variables Globales
// =====================================================
let currentStudent = null;
let asistenciaData = [];
let evaluacionesData = [];

// =====================================================
// Inicialización
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    initializeTabs();
});

/**
 * Inicializa los event listeners
 */
function initializeEventListeners() {
    // Botón de búsqueda
    document.getElementById('btnBuscar').addEventListener('click', handleSearch);

    // Búsqueda con Enter
    document.getElementById('searchQuery').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    });

    // Botones de exportación
    document.getElementById('btnExportPDF')?.addEventListener('click', exportToPDF);
    document.getElementById('btnExportExcel')?.addEventListener('click', exportToExcel);
    document.getElementById('btnPrint')?.addEventListener('click', printReport);
}

/**
 * Inicializa la navegación por tabs
 */
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabId = btn.dataset.tab;

            // Actualizar botones
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Actualizar contenido
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });

            if (tabId === 'asistencia') {
                document.getElementById('tabAsistencia').classList.add('active');
            } else if (tabId === 'evaluaciones') {
                document.getElementById('tabEvaluaciones').classList.add('active');
            }
        });
    });
}

// =====================================================
// Búsqueda de Alumno
// =====================================================

/**
 * Maneja la búsqueda del alumno
 * Busca directamente en las tablas de historial de asistencia
 */
async function handleSearch() {
    const searchType = document.getElementById('searchType').value;
    const searchQuery = document.getElementById('searchQuery').value.trim();

    if (!searchQuery) {
        showNotification('Por favor ingresa un valor para buscar', 'warning');
        return;
    }

    showLoading(true);
    hideAllStates();

    try {
        // Buscar directamente en las tablas de historial de asistencia
        await loadAsistenciaDataBySearch(searchType, searchQuery);

        if (asistenciaData.length === 0) {
            showError('Alumno no encontrado',
                `No se encontró ningún alumno con ${getSearchTypeLabel(searchType)}: "${searchQuery}"`);
            return;
        }

        // Extraer datos del alumno del primer registro de asistencia
        const firstRecord = asistenciaData[0];
        currentStudent = {
            id_alumno: firstRecord.id_alumno,
            nombre: firstRecord.nombre_alumno,
            correo_electronico: firstRecord.correo_electronico,
            telefono: firstRecord.numero_telefono,
            turno: firstRecord.turno
        };

        // Cargar evaluaciones (placeholder por ahora)
        await loadEvaluacionesData(currentStudent);

        // Mostrar resultados
        displayResults();

    } catch (error) {
        console.error('Error en búsqueda:', error);
        showError('Error de conexión',
            'No se pudo completar la búsqueda. Verifica tu conexión e intenta nuevamente.');
    } finally {
        showLoading(false);
    }
}

/**
 * Carga los datos de asistencia buscando directamente por tipo de búsqueda
 */
async function loadAsistenciaDataBySearch(searchType, searchValue) {
    console.log('=== INICIO BÚSQUEDA ===');
    console.log('Tipo de búsqueda:', searchType);
    console.log('Valor de búsqueda:', searchValue);

    try {
        let filterColumn = '';
        let filterOperator = 'eq';

        // Determinar columna según tipo de búsqueda
        switch (searchType) {
            case 'id':
                filterColumn = 'id_alumno';
                break;
            case 'email':
                filterColumn = 'correo_electronico';
                filterOperator = 'ilike';
                break;
            case 'nombre':
                filterColumn = 'nombre_alumno';
                filterOperator = 'ilike';
                break;
            default:
                filterColumn = 'id_alumno';
        }

        console.log('Columna de filtro:', filterColumn);
        console.log('Operador:', filterOperator);

        // Consultar tabla de asistencia EN LÍNEA
        console.log('Consultando historico_asistencia_en_linea...');
        let queryEnLinea = supabaseSoporte
            .from('historico_asistencia_en_linea')
            .select('*');

        if (filterOperator === 'ilike') {
            queryEnLinea = queryEnLinea.ilike(filterColumn, `%${searchValue}%`);
        } else {
            queryEnLinea = queryEnLinea.eq(filterColumn, searchValue);
        }

        const { data: dataEnLinea, error: errorEnLinea } = await queryEnLinea
            .order('fecha_inicio_semana', { ascending: false });

        console.log('Resultado en_linea:', { data: dataEnLinea, error: errorEnLinea });

        if (errorEnLinea) {
            console.error('Error cargando asistencia en línea:', errorEnLinea);
        }

        // Consultar tabla de asistencia PRESENCIAL
        console.log('Consultando historico_asistencia_presencial...');
        let queryPresencial = supabaseSoporte
            .from('historico_asistencia_presencial')
            .select('*');

        if (filterOperator === 'ilike') {
            queryPresencial = queryPresencial.ilike(filterColumn, `%${searchValue}%`);
        } else {
            queryPresencial = queryPresencial.eq(filterColumn, searchValue);
        }

        const { data: dataPresencial, error: errorPresencial } = await queryPresencial
            .order('fecha_inicio_semana', { ascending: false });

        console.log('Resultado presencial:', { data: dataPresencial, error: errorPresencial });

        if (errorPresencial) {
            console.error('Error cargando asistencia presencial:', errorPresencial);
        }

        // Agregar tipo a cada registro para identificar la fuente
        const registrosEnLinea = (dataEnLinea || []).map(r => ({
            ...r,
            tipo_asistencia: 'En Línea',
            tiene_tiempos: true
        }));

        const registrosPresencial = (dataPresencial || []).map(r => ({
            ...r,
            tipo_asistencia: 'Presencial',
            tiene_tiempos: false,
            tiempo_lunes: null,
            tiempo_martes: null,
            tiempo_miercoles: null,
            tiempo_jueves: null,
            tiempo_viernes: null
        }));

        // Combinar y ordenar por fecha (más reciente primero)
        asistenciaData = [...registrosEnLinea, ...registrosPresencial]
            .sort((a, b) => {
                const fechaA = new Date(a.fecha_inicio_semana);
                const fechaB = new Date(b.fecha_inicio_semana);
                return fechaB - fechaA;
            });

        console.log(`Total registros: ${asistenciaData.length} (${registrosEnLinea.length} en línea, ${registrosPresencial.length} presencial)`);
        console.log('=== FIN BÚSQUEDA ===');

    } catch (error) {
        console.error('Error cargando asistencia:', error);
        asistenciaData = [];
    }
}

/**
 * Carga los datos de evaluaciones del alumno
 * TODO: Implementar cuando exista la tabla de evaluaciones
 */
async function loadEvaluacionesData(student) {
    console.log('Cargando evaluaciones para:', student.id_alumno);

    try {
        // Consultar tabla de evaluaciones
        const { data, error } = await supabaseSoporte
            .from('evaluaciones')
            .select('*')
            .eq('id', student.id_alumno)
            .order('fecha_evaluacion', { ascending: false });

        if (error) {
            console.error('Error cargando evaluaciones:', error);
            evaluacionesData = [];
            return;
        }

        evaluacionesData = data || [];
        console.log(`Evaluaciones cargadas: ${evaluacionesData.length}`);

    } catch (error) {
        console.error('Error cargando evaluaciones:', error);
        evaluacionesData = [];
    }
}

// =====================================================
// Visualización de Resultados
// =====================================================

/**
 * Muestra todos los resultados del alumno
 */
function displayResults() {
    hideAllStates();

    // Mostrar información del alumno
    displayStudentInfo();

    // Calcular y mostrar estadísticas
    displayStats();

    // Mostrar tablas de datos
    displayAsistenciaTable();
    displayEvaluacionesTable();

    // Mostrar sección de resultados
    document.getElementById('resultsSection').classList.remove('hidden');
}

/**
 * Muestra la información del alumno
 */
function displayStudentInfo() {
    const nombre = currentStudent.nombre || 'Sin nombre';
    const iniciales = getInitials(nombre);

    document.getElementById('studentAvatar').textContent = iniciales;
    document.getElementById('studentName').textContent = nombre;
    document.getElementById('studentId').textContent = `ID: ${currentStudent.id_alumno || '--'}`;
    document.getElementById('studentEmail').textContent = currentStudent.correo_electronico || '--';
    document.getElementById('studentTurno').textContent = `Turno: ${currentStudent.turno || '--'}`;
}

/**
 * Calcula y muestra las estadísticas
 */
function displayStats() {
    // Calcular porcentaje de asistencia
    const asistenciaPercent = calculateAsistenciaPercent();
    document.getElementById('statAsistencia').textContent = `${asistenciaPercent}%`;

    // Calcular promedio de evaluaciones
    const promedioEval = calculatePromedioEvaluaciones();
    document.getElementById('statPromedio').textContent = promedioEval > 0 ? promedioEval.toFixed(1) : '--';

    // Total de semanas
    document.getElementById('statSemanas').textContent = asistenciaData.length;

    // Total de evaluaciones
    document.getElementById('statTotal').textContent = evaluacionesData.length;
}

/**
 * Calcula el porcentaje general de asistencia
 * Soporta ambos formatos: en línea (Completa/Parcial/Incompleta) y presencial (ASISTIÓ/NO ASISTIÓ)
 */
function calculateAsistenciaPercent() {
    if (asistenciaData.length === 0) return 0;

    let totalDias = 0;
    let diasAsistidos = 0;

    asistenciaData.forEach(semana => {
        const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];

        dias.forEach(dia => {
            const valor = semana[dia];
            if (valor && valor !== '' && valor !== null) {
                totalDias++;
                // Asistencia en línea
                if (valor === 'Asistencia Completa') {
                    diasAsistidos += 1;
                } else if (valor === 'Asistencia Parcial') {
                    diasAsistidos += 0.7;
                } else if (valor === 'Asistencia Incompleta') {
                    diasAsistidos += 0.3;
                }
                // Asistencia presencial
                else if (valor === 'ASISTIÓ') {
                    diasAsistidos += 1;
                }
                // 'NO ASISTIÓ' suma 0
            }
        });
    });

    if (totalDias === 0) return 0;
    return Math.round((diasAsistidos / totalDias) * 100);
}

/**
 * Calcula el promedio de evaluaciones (solo las realizadas)
 */
function calculatePromedioEvaluaciones() {
    // Filtrar solo evaluaciones que fueron realizadas y tienen calificación
    const realizadas = evaluacionesData.filter(
        item => item.realizo_examen === 'SI' && item.calificacion !== null
    );

    if (realizadas.length === 0) return 0;

    const total = realizadas.reduce((sum, item) => sum + (item.calificacion || 0), 0);
    return Math.round(total / realizadas.length);
}

/**
 * Muestra la tabla de asistencia
 */
function displayAsistenciaTable() {
    const tbody = document.getElementById('tablaAsistencia');
    const emptyState = document.getElementById('emptyAsistencia');

    if (asistenciaData.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    tbody.innerHTML = asistenciaData.map(semana => {
        const weekPercent = calculateWeekPercent(semana);
        const percentClass = weekPercent >= 80 ? 'high' : weekPercent >= 50 ? 'medium' : 'low';

        // Determinar el tipo de asistencia (En Línea o Presencial)
        const tipoAsistencia = semana.tipo_asistencia || 'En Línea';
        const tipoBadgeClass = tipoAsistencia === 'Presencial' ? 'badge-presencial' : 'badge-enlinea';

        // Formatear rango de semana compacto
        const rangoSemana = formatSemanaCompacta(semana.fecha_inicio_semana, semana.fecha_fin_semana);

        return `
            <tr>
                <td style="text-align: center;">
                    <span class="semana-badge">${rangoSemana}</span>
                </td>
                <td style="text-align: center;">
                    <span class="badge ${tipoBadgeClass}">${tipoAsistencia === 'Presencial' ? '🏫 Presencial' : '💻 En Línea'}</span>
                </td>
                <td>${formatAsistencia(semana.lunes, semana.tiempo_lunes)}</td>
                <td>${formatAsistencia(semana.martes, semana.tiempo_martes)}</td>
                <td>${formatAsistencia(semana.miercoles, semana.tiempo_miercoles)}</td>
                <td>${formatAsistencia(semana.jueves, semana.tiempo_jueves)}</td>
                <td>${formatAsistencia(semana.viernes, semana.tiempo_viernes)}</td>
                <td style="text-align: center;">
                    <span class="week-percentage ${percentClass}">${weekPercent}%</span>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Calcula el porcentaje de una semana
 * Soporta ambos formatos: en línea y presencial
 */
function calculateWeekPercent(semana) {
    const dias = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'];
    let total = 0;
    let count = 0;

    dias.forEach(dia => {
        const valor = semana[dia];
        if (valor && valor !== '' && valor !== null) {
            count++;
            // Asistencia en línea
            if (valor === 'Asistencia Completa') {
                total += 100;
            } else if (valor === 'Asistencia Parcial') {
                total += 70;
            } else if (valor === 'Asistencia Incompleta') {
                total += 30;
            }
            // Asistencia presencial
            else if (valor === 'ASISTIÓ') {
                total += 100;
            }
            // 'NO ASISTIÓ' suma 0
        }
    });

    return count > 0 ? Math.round(total / count) : 0;
}

/**
 * Formatea el valor de asistencia para mostrar
 * Soporta ambos formatos: en línea y presencial
 */
function formatAsistencia(valor, tiempo) {
    if (!valor || valor === '' || valor === null) {
        return '<span class="badge badge-absent">--</span>';
    }

    let badgeClass = 'badge-absent';
    let label = valor;

    switch (valor) {
        // Asistencia en línea
        case 'Asistencia Completa':
            badgeClass = 'badge-complete';
            label = '✓ Completa';
            break;
        case 'Asistencia Parcial':
            badgeClass = 'badge-partial';
            label = '◐ Parcial';
            break;
        case 'Asistencia Incompleta':
            badgeClass = 'badge-incomplete';
            label = '○ Incompleta';
            break;
        // Asistencia presencial
        case 'ASISTIÓ':
            badgeClass = 'badge-complete';
            label = '✓ Presente';
            break;
        case 'NO ASISTIÓ':
            badgeClass = 'badge-absent';
            label = '✗ Ausente';
            break;
    }

    let html = `<div style="text-align: center;"><span class="badge ${badgeClass}">${label}</span>`;

    if (tiempo && tiempo !== '' && tiempo !== null) {
        html += `<br><small style="color: var(--color-text-muted);">🕐 ${tiempo}</small>`;
    }

    html += '</div>';
    return html;
}

/**
 * Muestra la tabla de evaluaciones
 */
function displayEvaluacionesTable() {
    const tbody = document.getElementById('tablaEvaluaciones');
    const emptyState = document.getElementById('emptyEvaluaciones');

    if (evaluacionesData.length === 0) {
        tbody.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    tbody.innerHTML = evaluacionesData.map(item => {
        // Determinar estado correcto basado en calificación (>=75% = APROBADO)
        let statusClass = 'badge-warning';
        let statusLabel = 'NO REALIZÓ';

        if (item.calificacion !== null && item.calificacion !== undefined) {
            if (item.calificacion >= 75) {
                statusClass = 'badge-success';
                statusLabel = 'APROBADO';
            } else {
                statusClass = 'badge-danger';
                statusLabel = 'NO APROBADO';
            }
        }

        // Formatear rango de semana de forma compacta: "08-12 dic"
        const rangoSemana = formatSemanaCompacta(item.fecha_inicio, item.fecha_final);

        // Formatear calificación con símbolo %
        let calificacion = '--';
        let calClass = '';
        if (item.calificacion !== null && item.calificacion !== undefined) {
            calificacion = item.calificacion.toFixed(1) + '%';
            calClass = item.calificacion >= 75 ? 'color: #059669;' : 'color: #dc2626;';
        }

        return `
            <tr>
                <td style="text-align: center;">${formatDateShort(item.fecha_evaluacion)}</td>
                <td style="text-align: center;"><span class="semana-badge">${rangoSemana}</span></td>
                <td style="text-align: center;">${item.realizo_examen === 'SI' ? '✓' : '✗'}</td>
                <td style="text-align: center;"><strong style="${calClass}">${calificacion}</strong></td>
                <td style="text-align: center;"><span class="badge ${statusClass}">${statusLabel}</span></td>
            </tr>
        `;
    }).join('');
}

/**
 * Formatea la semana de forma compacta: "08-12 dic"
 */
function formatSemanaCompacta(fechaInicio, fechaFinal) {
    if (!fechaInicio || !fechaFinal) return '--';

    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    const inicio = new Date(fechaInicio + 'T00:00:00');
    const final = new Date(fechaFinal + 'T00:00:00');

    const diaInicio = inicio.getDate().toString().padStart(2, '0');
    const diaFinal = final.getDate().toString().padStart(2, '0');
    const mes = meses[final.getMonth()];

    return `${diaInicio}-${diaFinal} ${mes}`;
}

/**
 * Formatea fecha corta: "13 dic"
 */
function formatDateShort(dateStr) {
    if (!dateStr) return '--';

    const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
    const date = new Date(dateStr + 'T00:00:00');

    const dia = date.getDate();
    const mes = meses[date.getMonth()];

    return `${dia} ${mes}`;
}

// =====================================================
// Utilidades
// =====================================================

/**
 * Obtiene las iniciales del nombre
 */
function getInitials(name) {
    if (!name) return '--';
    const parts = name.split(' ').filter(p => p.length > 0);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0]?.substring(0, 2).toUpperCase() || '--';
}

/**
 * Formatea una fecha
 */
function formatDate(dateStr) {
    if (!dateStr) return '--';

    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

/**
 * Obtiene la etiqueta del tipo de búsqueda
 */
function getSearchTypeLabel(type) {
    switch (type) {
        case 'id': return 'ID';
        case 'email': return 'correo electrónico';
        case 'nombre': return 'nombre';
        default: return type;
    }
}

// =====================================================
// Estados de UI
// =====================================================

/**
 * Muestra u oculta el estado de carga
 */
function showLoading(show) {
    const loadingState = document.getElementById('loadingState');
    if (show) {
        loadingState.classList.remove('hidden');
    } else {
        loadingState.classList.add('hidden');
    }
}

/**
 * Muestra el estado de error
 */
function showError(title, text) {
    document.getElementById('errorTitle').textContent = title;
    document.getElementById('errorText').textContent = text;
    document.getElementById('errorState').classList.remove('hidden');
}

/**
 * Oculta todos los estados
 */
function hideAllStates() {
    document.getElementById('initialState').classList.add('hidden');
    document.getElementById('loadingState').classList.add('hidden');
    document.getElementById('errorState').classList.add('hidden');
    document.getElementById('resultsSection').classList.add('hidden');
}

/**
 * Resetea la búsqueda
 */
function resetSearch() {
    document.getElementById('searchQuery').value = '';
    hideAllStates();
    document.getElementById('initialState').classList.remove('hidden');
}

/**
 * Muestra una notificación
 */
function showNotification(message, type = 'info') {
    // Crear notificación simple
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        background: ${type === 'warning' ? '#f59e0b' : '#4f46e5'};
        color: white;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        z-index: 9999;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// =====================================================
// Exportación
// =====================================================

/**
 * Exporta el reporte a PDF (placeholder)
 */
function exportToPDF() {
    showNotification('Generando PDF... (Funcionalidad en desarrollo)', 'info');
    // TODO: Implementar con jsPDF u otra librería
}

/**
 * Exporta el reporte a Excel (placeholder)
 */
function exportToExcel() {
    showNotification('Generando Excel... (Funcionalidad en desarrollo)', 'info');
    // TODO: Implementar con SheetJS u otra librería
}

/**
 * Imprime el reporte
 */
function printReport() {
    window.print();
}

// =====================================================
// CSS para animación de notificación
// =====================================================
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(style);
