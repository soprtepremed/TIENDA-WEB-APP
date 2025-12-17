/**
 * Cargar Evaluaciones - JavaScript
 * 
 * Permite importar evaluaciones desde un archivo CSV
 * y guardarlas en la tabla soporte.evaluaciones de Supabase
 */

// =====================================================
// Configuración de Supabase
// =====================================================
const SUPABASE_URL = 'https://api.premed.mx';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

const supabaseSoporte = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    db: { schema: 'soporte' }
});

// =====================================================
// Variables Globales
// =====================================================
let selectedFile = null;
let parsedData = [];
let validRecords = [];

// =====================================================
// Inicialización
// =====================================================
document.addEventListener('DOMContentLoaded', () => {
    console.log('📤 Módulo de carga de evaluaciones iniciado');
    initUploadZone();
    initButtons();
});

// =====================================================
// Zona de Carga (Drag & Drop)
// =====================================================
function initUploadZone() {
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    // Click para seleccionar archivo
    uploadZone.addEventListener('click', () => fileInput.click());

    // Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0 && files[0].name.endsWith('.csv')) {
            handleFileSelect(files[0]);
        } else {
            alert('Por favor, selecciona un archivo CSV válido.');
        }
    });

    // Selección de archivo
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
}

// =====================================================
// Botones
// =====================================================
function initButtons() {
    document.getElementById('btnRemove').addEventListener('click', resetUpload);
    document.getElementById('btnCancel').addEventListener('click', resetUpload);
    document.getElementById('btnUpload').addEventListener('click', uploadToSupabase);
    document.getElementById('btnNewUpload').addEventListener('click', resetUpload);
}

// =====================================================
// Manejo de Archivo
// =====================================================
function handleFileSelect(file) {
    selectedFile = file;

    // Mostrar info del archivo
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileSize').textContent = formatFileSize(file.size);
    document.getElementById('fileInfo').classList.add('visible');
    document.getElementById('uploadZone').style.display = 'none';

    // Parsear CSV
    parseCSV(file);
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// =====================================================
// Parseo de CSV
// =====================================================
function parseCSV(file) {
    const reader = new FileReader();

    reader.onload = (e) => {
        const content = e.target.result;
        const lines = content.split('\n').filter(line => line.trim());

        parsedData = [];
        validRecords = [];
        let skipped = 0;

        lines.forEach((line, index) => {
            // Parsear línea (considera comas dentro de comillas)
            const parts = parseCSVLine(line);

            // Ignorar encabezados
            if (parts[0] === 'ID' || parts[0].trim() === '') {
                skipped++;
                return;
            }

            // Validar que ID sea numérico
            const id = parts[0].trim();
            if (!/^\d+$/.test(id)) {
                skipped++;
                return;
            }

            // Procesar calificación (formato "79/90" -> porcentaje)
            let calificacion = null;
            if (parts[5] && parts[5].trim()) {
                const calStr = parts[5].trim();
                if (calStr.includes('/')) {
                    const [obtenidos, total] = calStr.split('/').map(n => parseFloat(n));
                    if (!isNaN(obtenidos) && !isNaN(total) && total > 0) {
                        calificacion = Math.round((obtenidos / total) * 100 * 100) / 100;
                    }
                } else {
                    const num = parseFloat(calStr);
                    if (!isNaN(num)) calificacion = num;
                }
            }

            // Procesar fechas (DD/MM/YYYY -> YYYY-MM-DD)
            const fechaEval = parseDate(parts[6]);
            const fechaInicio = parseDate(parts[7]);
            const fechaFinal = parseDate(parts[8]);

            const record = {
                id: id,
                nombres: parts[1] ? parts[1].trim() : null,
                turno: parts[2] ? parts[2].trim() : null,
                modalidad: parts[3] ? parts[3].trim() : null,
                realizo_examen: parts[4] ? parts[4].trim() : null,
                calificacion: calificacion,
                fecha_evaluacion: fechaEval,
                fecha_inicio: fechaInicio,
                fecha_final: fechaFinal,
                estado: parts[9] ? parts[9].trim() : null
            };

            parsedData.push(record);

            // Validar registro completo
            if (record.id && record.turno && record.fecha_evaluacion) {
                validRecords.push(record);
            }
        });

        // Mostrar vista previa
        showPreview(skipped);
    };

    reader.readAsText(file, 'UTF-8');
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());

    return result;
}

function parseDate(dateStr) {
    if (!dateStr || dateStr.trim() === '') return null;

    const trimmed = dateStr.trim();

    // Si ya está en formato YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
    }

    // Formato DD/MM/YYYY
    const parts = trimmed.split('/');
    if (parts.length !== 3) return null;

    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];

    return `${year}-${month}-${day}`;
}

// =====================================================
// Vista Previa
// =====================================================
function showPreview(skipped) {
    const previewBody = document.getElementById('previewBody');

    // Actualizar estadísticas
    document.getElementById('totalRecords').textContent = parsedData.length;
    document.getElementById('validRecords').textContent = validRecords.length;
    document.getElementById('skippedRecords').textContent = skipped;

    // Generar tabla de vista previa (máximo 10 filas)
    const previewRecords = validRecords.slice(0, 10);

    previewBody.innerHTML = previewRecords.map(record => `
        <tr>
            <td>${record.id}</td>
            <td>${record.nombres || '--'}</td>
            <td>${record.turno || '--'}</td>
            <td>${record.realizo_examen || '--'}</td>
            <td>${record.calificacion !== null ? record.calificacion + '%' : '--'}</td>
            <td>${record.estado || '--'}</td>
            <td>${record.fecha_evaluacion || '--'}</td>
        </tr>
    `).join('');

    if (validRecords.length > 10) {
        previewBody.innerHTML += `
            <tr>
                <td colspan="7" style="text-align: center; color: var(--color-text-muted);">
                    ... y ${validRecords.length - 10} registros más
                </td>
            </tr>
        `;
    }

    // Mostrar secciones
    document.getElementById('previewSection').classList.add('visible');
    document.getElementById('actionsSection').classList.add('visible');
}

// =====================================================
// Subida a Supabase
// =====================================================
async function uploadToSupabase() {
    if (validRecords.length === 0) {
        alert('No hay registros válidos para cargar.');
        return;
    }

    // Ocultar acciones, mostrar progreso
    document.getElementById('actionsSection').classList.remove('visible');
    document.getElementById('progressSection').classList.add('visible');

    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');

    let inserted = 0;
    let errors = 0;
    const batchSize = 10; // Insertar de 10 en 10
    const totalBatches = Math.ceil(validRecords.length / batchSize);

    for (let i = 0; i < validRecords.length; i += batchSize) {
        const batch = validRecords.slice(i, i + batchSize);

        try {
            const { error } = await supabaseSoporte
                .from('evaluaciones')
                .insert(batch);

            if (error) {
                console.error('Error insertando batch:', error);
                errors += batch.length;
            } else {
                inserted += batch.length;
            }
        } catch (err) {
            console.error('Error:', err);
            errors += batch.length;
        }

        // Actualizar progreso
        const progress = Math.round(((i + batch.length) / validRecords.length) * 100);
        progressFill.style.width = progress + '%';
        progressText.textContent = `Procesando... ${Math.min(i + batchSize, validRecords.length)} de ${validRecords.length}`;
    }

    // Mostrar resultado
    document.getElementById('progressSection').classList.remove('visible');
    showResult(inserted, errors);
}

function showResult(inserted, errors) {
    const resultSection = document.getElementById('resultSection');
    const resultIcon = document.getElementById('resultIcon');
    const resultTitle = document.getElementById('resultTitle');
    const resultMessage = document.getElementById('resultMessage');

    resultSection.classList.remove('success', 'error');

    if (errors === 0) {
        resultSection.classList.add('success', 'visible');
        resultIcon.textContent = '✅';
        resultTitle.textContent = '¡Carga exitosa!';
        resultMessage.textContent = `Se importaron ${inserted} registros correctamente.`;
    } else if (inserted > 0) {
        resultSection.classList.add('success', 'visible');
        resultIcon.textContent = '⚠️';
        resultTitle.textContent = 'Carga parcial';
        resultMessage.textContent = `Se importaron ${inserted} registros. ${errors} registros fallaron.`;
    } else {
        resultSection.classList.add('error', 'visible');
        resultIcon.textContent = '❌';
        resultTitle.textContent = 'Error en la carga';
        resultMessage.textContent = `No se pudo importar ningún registro. Verifica el formato del archivo.`;
    }
}

// =====================================================
// Reset
// =====================================================
function resetUpload() {
    selectedFile = null;
    parsedData = [];
    validRecords = [];

    // Ocultar todas las secciones
    document.getElementById('fileInfo').classList.remove('visible');
    document.getElementById('previewSection').classList.remove('visible');
    document.getElementById('actionsSection').classList.remove('visible');
    document.getElementById('progressSection').classList.remove('visible');
    document.getElementById('resultSection').classList.remove('visible', 'success', 'error');

    // Mostrar zona de carga
    document.getElementById('uploadZone').style.display = 'block';

    // Limpiar input
    document.getElementById('fileInput').value = '';
    document.getElementById('previewBody').innerHTML = '';
    document.getElementById('progressFill').style.width = '0%';
}
