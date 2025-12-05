// ===================================
// Estado de la Aplicación
// ===================================
let products = [];
let cart = [];

// ===================================
// Inicialización
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadProductsForSale();
});

// ===================================
// Event Listeners
// ===================================
function initializeEventListeners() {
    const processSaleBtn = document.getElementById('processSaleBtn');
    const clearCartBtn = document.getElementById('clearCartBtn');
    const paymentMethod = document.getElementById('paymentMethod');
    const amountPaid = document.getElementById('amountPaid');

    processSaleBtn.addEventListener('click', processSale);
    clearCartBtn.addEventListener('click', clearCart);

    // Mostrar/ocultar campos de efectivo según método de pago
    paymentMethod.addEventListener('change', handlePaymentMethodChange);

    // Calcular cambio automáticamente
    amountPaid.addEventListener('input', calculateChange);
}

function handlePaymentMethodChange() {
    const paymentMethod = document.getElementById('paymentMethod').value;
    const cashPaymentFields = document.getElementById('cashPaymentFields');
    const amountPaid = document.getElementById('amountPaid');

    if (paymentMethod === 'efectivo') {
        cashPaymentFields.style.display = 'block';
        amountPaid.required = true;
    } else {
        cashPaymentFields.style.display = 'none';
        amountPaid.required = false;
        amountPaid.value = '';
        document.getElementById('changeDisplay').style.display = 'none';
    }
}

function calculateChange() {
    const amountPaid = parseFloat(document.getElementById('amountPaid').value) || 0;
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const changeDisplay = document.getElementById('changeDisplay');
    const changeAmount = document.getElementById('changeAmount');

    if (amountPaid >= total && amountPaid > 0) {
        const change = amountPaid - total;
        changeAmount.textContent = `$${formatPrice(change)}`;
        changeDisplay.style.display = 'flex';
    } else {
        changeDisplay.style.display = 'none';
    }
}

// ===================================
// Cargar Productos desde Firebase
// ===================================
function loadProductsForSale() {
    productsCollection.orderBy('name', 'asc').onSnapshot((snapshot) => {
        products = [];
        snapshot.forEach((doc) => {
            const productData = doc.data();
            // Solo mostrar productos con stock > 0
            if (productData.quantity > 0) {
                products.push({
                    id: doc.id,
                    ...productData
                });
            }
        });
        renderProducts();
    }, (error) => {
        console.error('Error al cargar productos:', error);
        showErrorMessage('Error al cargar productos de la base de datos');
    });
}

// ===================================
// Renderizar Productos
// ===================================
function renderProducts() {
    const productsGrid = document.getElementById('productsGrid');
    const emptyState = document.getElementById('emptyState');

    productsGrid.innerHTML = '';

    if (products.length === 0) {
        emptyState.classList.add('active');
        productsGrid.style.display = 'none';
    } else {
        emptyState.classList.remove('active');
        productsGrid.style.display = 'grid';

        products.forEach(product => {
            const card = createProductCard(product);
            productsGrid.appendChild(card);
        });
    }
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';

    // Verificar si está en el carrito
    const cartItem = cart.find(item => item.id === product.id);
    const availableStock = product.quantity - (cartItem ? cartItem.quantity : 0);
    const isOutOfStock = availableStock <= 0;

    if (isOutOfStock) {
        card.classList.add('out-of-stock');
    }

    // Imagen
    let imageHTML;
    if (product.image) {
        imageHTML = `<img src="${product.image}" alt="${product.name}" class="product-image">`;
    } else {
        imageHTML = `<div class="product-image placeholder">📦</div>`;
    }

    // Stock class
    const stockClass = product.quantity <= (product.minStock || 10) ? 'low-stock' : '';

    card.innerHTML = `
        ${imageHTML}
        <div class="product-info">
            <h3 class="product-name">${escapeHtml(product.name)}</h3>
            <div class="product-price">$${formatPrice(product.price)}</div>
            <div class="product-stock ${stockClass}">
                Stock: ${availableStock} disponibles
            </div>
            <button 
                class="add-to-cart-btn" 
                onclick="addToCart('${product.id}')"
                ${isOutOfStock ? 'disabled' : ''}
            >
                ${isOutOfStock ? 'Sin Stock' : '+ Agregar'}
            </button>
        </div>
    `;

    return card;
}

// ===================================
// Gestión del Carrito
// ===================================
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Verificar si ya está en el carrito
    const existingItem = cart.find(item => item.id === productId);

    if (existingItem) {
        // Verificar stock disponible
        if (existingItem.quantity >= product.quantity) {
            showErrorMessage('No hay más stock disponible de este producto');
            return;
        }
        existingItem.quantity++;
    } else {
        // Agregar nuevo item
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1,
            maxStock: product.quantity
        });
    }

    showSuccessMessage(`${product.name} agregado al carrito`);
    renderCart();
    renderProducts(); // Actualizar disponibilidad
}

function updateCartItemQuantity(productId, change) {
    const cartItem = cart.find(item => item.id === productId);
    if (!cartItem) return;

    const newQuantity = cartItem.quantity + change;

    // Eliminar si llega a 0
    if (newQuantity <= 0) {
        removeFromCart(productId);
        return;
    }

    // Verificar stock disponible
    if (newQuantity > cartItem.maxStock) {
        showErrorMessage('No hay más stock disponible');
        return;
    }

    cartItem.quantity = newQuantity;
    renderCart();
    renderProducts(); // Actualizar disponibilidad
}

function removeFromCart(productId) {
    const index = cart.findIndex(item => item.id === productId);
    if (index > -1) {
        cart.splice(index, 1);
        renderCart();
        renderProducts(); // Actualizar disponibilidad
    }
}

function clearCart() {
    if (cart.length === 0) {
        showErrorMessage('El carrito ya está vacío');
        return;
    }

    if (confirm('¿Estás seguro de limpiar todo el carrito?')) {
        cart = [];
        renderCart();
        renderProducts();
        showSuccessMessage('Carrito limpiado');
    }
}

// ===================================
// Renderizar Carrito
// ===================================
function renderCart() {
    const cartItems = document.getElementById('cartItems');
    const emptyCart = document.getElementById('emptyCart');
    const cartSummary = document.getElementById('cartSummary');
    const clearCartBtn = document.getElementById('clearCartBtn');

    cartItems.innerHTML = '';

    if (cart.length === 0) {
        emptyCart.style.display = 'block';
        cartSummary.style.display = 'none';
        clearCartBtn.style.display = 'none';
    } else {
        emptyCart.style.display = 'none';
        cartSummary.style.display = 'block';
        clearCartBtn.style.display = 'block';

        cart.forEach(item => {
            const cartItemEl = createCartItem(item);
            cartItems.appendChild(cartItemEl);
        });

        updateCartSummary();
    }
}

function createCartItem(item) {
    const div = document.createElement('div');
    div.className = 'cart-item';

    // Imagen
    let imageHTML;
    if (item.image) {
        imageHTML = `<img src="${item.image}" alt="${item.name}" class="cart-item-image">`;
    } else {
        imageHTML = `<div class="cart-item-image placeholder">📦</div>`;
    }

    const subtotal = item.price * item.quantity;

    div.innerHTML = `
        ${imageHTML}
        <div class="cart-item-details">
            <div class="cart-item-name">${escapeHtml(item.name)}</div>
            <div class="cart-item-price">$${formatPrice(item.price)} c/u</div>
            <div class="cart-item-controls">
                <button class="quantity-btn" onclick="updateCartItemQuantity('${item.id}', -1)">−</button>
                <span class="quantity-value">${item.quantity}</span>
                <button class="quantity-btn" onclick="updateCartItemQuantity('${item.id}', 1)">+</button>
                <span class="cart-item-subtotal">$${formatPrice(subtotal)}</span>
            </div>
        </div>
        <button class="remove-item-btn" onclick="removeFromCart('${item.id}')">✕</button>
    `;

    return div;
}

function updateCartSummary() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const total = subtotal; // Aquí podrías agregar impuestos o descuentos

    document.getElementById('subtotalAmount').textContent = `$${formatPrice(subtotal)}`;
    document.getElementById('totalAmount').textContent = `$${formatPrice(total)}`;

    // Recalcular cambio si hay monto pagado
    calculateChange();
}

// Hacer funciones globales
window.addToCart = addToCart;
window.updateCartItemQuantity = updateCartItemQuantity;
window.removeFromCart = removeFromCart;

// ===================================
// Procesar Venta
// ===================================
function processSale() {
    if (cart.length === 0) {
        showErrorMessage('El carrito está vacío');
        return;
    }

    // Validar método de pago
    const paymentMethod = document.getElementById('paymentMethod').value;
    if (!paymentMethod) {
        showErrorMessage('Selecciona un método de pago');
        return;
    }

    // Validar monto pagado si es efectivo
    const amountPaidInput = document.getElementById('amountPaid');
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (paymentMethod === 'efectivo') {
        const amountPaid = parseFloat(amountPaidInput.value) || 0;
        if (amountPaid < total) {
            showErrorMessage('El monto pagado debe ser mayor o igual al total');
            return;
        }
    }

    // Confirmar venta
    if (!confirm(`¿Procesar venta por $${formatPrice(total)}?`)) {
        return;
    }

    showLoadingMessage('Procesando venta...');

    // Obtener comentarios
    const comments = document.getElementById('saleComments').value.trim();
    const amountPaid = paymentMethod === 'efectivo' ? parseFloat(amountPaidInput.value) : total;
    const change = paymentMethod === 'efectivo' ? amountPaid - total : 0;

    // Preparar datos de la venta
    const saleData = {
        fecha: firebase.firestore.FieldValue.serverTimestamp(),
        items: cart.map(item => ({
            productId: item.id,
            productName: item.name,
            quantity: item.quantity,
            pricePerUnit: item.price,
            subtotal: item.price * item.quantity,
            image: item.image || null
        })),
        total: total,
        paymentMethod: paymentMethod,
        amountPaid: amountPaid,
        change: change,
        comments: comments || null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Crear batch para operaciones atómicas
    const batch = db.batch();

    // 1. Guardar la venta
    const saleRef = db.collection('ventas').doc();
    batch.set(saleRef, saleData);

    // 2. Reducir el stock de cada producto
    cart.forEach(item => {
        const productRef = productsCollection.doc(item.id);
        batch.update(productRef, {
            quantity: firebase.firestore.FieldValue.increment(-item.quantity)
        });
    });

    // Ejecutar todas las operaciones
    batch.commit()
        .then(() => {
            console.log('Venta procesada exitosamente');
            showSuccessMessage(`¡Venta procesada! Total: $${formatPrice(total)}`);

            // Limpiar carrito y formulario
            cart = [];
            document.getElementById('saleComments').value = '';
            document.getElementById('paymentMethod').value = '';
            document.getElementById('amountPaid').value = '';
            document.getElementById('cashPaymentFields').style.display = 'none';
            document.getElementById('changeDisplay').style.display = 'none';

            renderCart();

            // Los productos se actualizarán automáticamente por el listener
        })
        .catch((error) => {
            console.error('Error al procesar venta:', error);
            showErrorMessage('Error al procesar la venta. Intenta de nuevo.');
        });
}

// ===================================
// Utilidades
// ===================================
function formatPrice(price) {
    return price.toFixed(2).replace(/\d(?=(\d{3})+\.)/g, '$&,');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showLoadingMessage(message) {
    const notification = document.createElement('div');
    notification.id = 'loadingNotification';
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #1B3A6B 0%, #0F2847 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.75rem;
        box-shadow: 0 10px 25px rgba(27, 58, 107, 0.3);
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    if (!document.getElementById('notificationStyles')) {
        style.id = 'notificationStyles';
        document.head.appendChild(style);
    }

    document.body.appendChild(notification);
}

function hideLoadingMessage() {
    const notification = document.getElementById('loadingNotification');
    if (notification) {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }
}

function showSuccessMessage(message) {
    hideLoadingMessage();

    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #D4AF37 0%, #B8941F 100%);
        color: #1B3A6B;
        padding: 1rem 1.5rem;
        border-radius: 0.75rem;
        box-shadow: 0 10px 25px rgba(212, 175, 55, 0.3);
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

function showErrorMessage(message) {
    hideLoadingMessage();

    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #DC2626 0%, #991B1B 100%);
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 0.75rem;
        box-shadow: 0 10px 25px rgba(220, 38, 38, 0.3);
        font-weight: 600;
        z-index: 1000;
        animation: slideIn 0.3s ease-out;
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 5000);
}
