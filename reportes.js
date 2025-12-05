// ===================================
// Estado de la Aplicación
// ===================================
let allSales = [];
let filteredSales = [];

// ===================================
// Inicialización
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    setDefaultDate();
    loadSales();
});

// ===================================
// Event Listeners
// ===================================
function initializeEventListeners() {
    const dateInput = document.getElementById('reportDate');
    const modal = document.getElementById('detailsModal');
    const closeModalBtn = document.querySelector('.close-modal');

    // Filtro de fecha
    dateInput.addEventListener('change', handleDateChange);

    // Cerrar modal
    closeModalBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    window.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
}

function setDefaultDate() {
    const today = new Date();
    const dateInput = document.getElementById('reportDate');
    dateInput.valueAsDate = today;
}

// ===================================
// Cargar Ventas desde Firebase
// ===================================
function loadSales() {
    // Escuchar cambios en tiempo real
    db.collection('ventas')
        .orderBy('createdAt', 'desc')
        .onSnapshot((snapshot) => {
            allSales = [];
            snapshot.forEach((doc) => {
                allSales.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            filterSalesByDate();
        }, (error) => {
            console.error('Error al cargar ventas:', error);
            alert('Error al cargar el historial de ventas');
        });
}

// ===================================
// Filtrado y Procesamiento
// ===================================
function handleDateChange() {
    filterSalesByDate();
}

function filterSalesByDate() {
    const dateInput = document.getElementById('reportDate');
    const selectedDate = new Date(dateInput.value + 'T00:00:00');

    filteredSales = allSales.filter(sale => {
        if (!sale.createdAt) return false;

        // Convertir timestamp de Firebase a Date
        const saleDate = sale.createdAt.toDate();

        return isSameDay(saleDate, selectedDate);
    });

    updateDashboard();
    renderSalesTable();
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
        d1.getMonth() === d2.getMonth() &&
        d1.getDate() === d2.getDate();
}

// ===================================
// Actualización del Dashboard (Corte de Caja)
// ===================================
function updateDashboard() {
    const stats = {
        efectivo: { total: 0, count: 0 },
        tarjeta: { total: 0, count: 0 },
        transferencia: { total: 0, count: 0 }
    };

    let totalDaily = 0;

    filteredSales.forEach(sale => {
        const method = sale.paymentMethod || 'efectivo'; // Default a efectivo si no existe
        const total = sale.total || 0;

        if (stats[method]) {
            stats[method].total += total;
            stats[method].count++;
        }

        totalDaily += total;
    });

    // Actualizar DOM
    updateStatCard('Cash', stats.efectivo);
    updateStatCard('Card', stats.tarjeta);
    updateStatCard('Transfer', stats.transferencia);

    document.getElementById('totalDaily').textContent = formatCurrency(totalDaily);
}

function updateStatCard(type, data) {
    document.getElementById(`total${type}`).textContent = formatCurrency(data.total);
    document.getElementById(`count${type}`).textContent = `${data.count} ventas`;
}

// ===================================
// Renderizado de Tabla
// ===================================
function renderSalesTable() {
    const tbody = document.getElementById('salesTableBody');
    const emptyState = document.getElementById('emptyHistory');
    const tableContainer = document.querySelector('.sales-table');

    tbody.innerHTML = '';

    if (filteredSales.length === 0) {
        tableContainer.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    tableContainer.style.display = 'table';
    emptyState.style.display = 'none';

    filteredSales.forEach(sale => {
        const row = document.createElement('tr');
        const date = sale.createdAt ? sale.createdAt.toDate() : new Date();

        row.innerHTML = `
            <td>
                <div style="font-weight: 600; color: var(--color-navy);">${formatTime(date)}</div>
                <div style="font-size: 0.75rem; color: var(--color-gray-500);">${formatDate(date)}</div>
            </td>
            <td style="font-weight: 700; color: var(--color-gold);">${formatCurrency(sale.total)}</td>
            <td>${getPaymentBadge(sale.paymentMethod)}</td>
            <td>${sale.items ? sale.items.length : 0} items</td>
            <td>
                <button class="btn-details" onclick="showSaleDetails('${sale.id}')">
                    Ver Detalles
                </button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function getPaymentBadge(method) {
    const labels = {
        'efectivo': 'Efectivo',
        'tarjeta': 'Tarjeta',
        'transferencia': 'Transferencia'
    };

    const classes = {
        'efectivo': 'badge-cash',
        'tarjeta': 'badge-card',
        'transferencia': 'badge-transfer'
    };

    const label = labels[method] || method;
    const className = classes[method] || 'badge-cash';

    return `<span class="badge ${className}">${label}</span>`;
}

// ===================================
// Detalles de Venta (Modal)
// ===================================
function showSaleDetails(saleId) {
    const sale = allSales.find(s => s.id === saleId);
    if (!sale) return;

    const modalBody = document.getElementById('modalBody');
    const date = sale.createdAt ? sale.createdAt.toDate() : new Date();

    let itemsHtml = '';
    if (sale.items && sale.items.length > 0) {
        itemsHtml = `
            <div class="detail-products">
                <div class="detail-products-title">Productos Vendidos</div>
                ${sale.items.map(item => `
                    <div class="product-item">
                        <span class="product-item-name">${item.quantity}x ${item.productName || item.name}</span>
                        <span class="product-item-price">${formatCurrency(item.subtotal || (item.price * item.quantity))}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    let paymentDetailsHtml = '';
    if (sale.paymentMethod === 'efectivo' && sale.amountPaid) {
        paymentDetailsHtml = `
            <div class="detail-row">
                <span class="detail-label">Monto Pagado:</span>
                <span class="detail-value">${formatCurrency(sale.amountPaid)}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Cambio:</span>
                <span class="detail-value">${formatCurrency(sale.change)}</span>
            </div>
        `;
    }

    modalBody.innerHTML = `
        <div class="detail-row">
            <span class="detail-label">ID Venta:</span>
            <span class="detail-value" style="font-size: 0.75rem;">${sale.id}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Fecha:</span>
            <span class="detail-value">${formatDate(date)} ${formatTime(date)}</span>
        </div>
        <div class="detail-row">
            <span class="detail-label">Método de Pago:</span>
            <span class="detail-value">${getPaymentBadge(sale.paymentMethod)}</span>
        </div>
        ${paymentDetailsHtml}
        <div class="detail-row" style="border-bottom: 2px solid var(--color-gray-200);">
            <span class="detail-label">Total:</span>
            <span class="detail-value" style="font-size: 1.25rem; font-weight: 700; color: var(--color-gold);">${formatCurrency(sale.total)}</span>
        </div>
        
        ${sale.comments ? `
            <div class="detail-row">
                <span class="detail-label">Comentarios:</span>
                <span class="detail-value" style="font-style: italic;">"${sale.comments}"</span>
            </div>
        ` : ''}

        ${itemsHtml}
    `;

    document.getElementById('detailsModal').classList.add('active');
}

// Hacer global para onclick
window.showSaleDetails = showSaleDetails;

// ===================================
// Utilidades
// ===================================
function formatCurrency(amount) {
    return new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN'
    }).format(amount);
}

function formatDate(date) {
    return date.toLocaleDateString('es-MX', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
}

function formatTime(date) {
    return date.toLocaleTimeString('es-MX', {
        hour: '2-digit',
        minute: '2-digit'
    });
}
