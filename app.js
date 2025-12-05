// ===================================
// Estado de la Aplicación
// ===================================
let products = [];

// ===================================
// Inicialización..
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    initializeEventListeners();
    loadProductsFromFirestore();
});

// ===================================
// Event Listeners
// ===================================
function initializeEventListeners() {
    const form = document.getElementById('productForm');
    const imageInput = document.getElementById('productImage');

    // Envío del formulario
    form.addEventListener('submit', handleFormSubmit);

    // Reset del formulario
    form.addEventListener('reset', handleFormReset);

    // Preview de imagen
    imageInput.addEventListener('change', handleImagePreview);
}

// ===================================
// Manejo del Formulario
// ===================================
function handleFormSubmit(e) {
    e.preventDefault();

    const formData = new FormData(e.target);
    const imageFile = document.getElementById('productImage').files[0];

    // Crear objeto de producto
    const product = {
        name: formData.get('productName').trim(),
        description: formData.get('productDescription').trim(),
        quantity: parseInt(formData.get('productQuantity')),
        price: parseFloat(formData.get('productPrice')),
        minStock: parseInt(formData.get('productMinStock')) || 10,
        image: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Si hay imagen, convertirla a base64
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function (event) {
            product.image = event.target.result;
            saveProductToFirestore(product);
        };
        reader.readAsDataURL(imageFile);
    } else {
        saveProductToFirestore(product);
    }
}

function handleFormReset() {
    // Limpiar preview de imagen
    const imagePreview = document.getElementById('imagePreview');
    imagePreview.classList.remove('active');
    imagePreview.innerHTML = '';
}

function handleImagePreview(e) {
    const file = e.target.files[0];
    const imagePreview = document.getElementById('imagePreview');

    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            imagePreview.innerHTML = `<img src="${event.target.result}" alt="Preview">`;
            imagePreview.classList.add('active');
        };
        reader.readAsDataURL(file);
    } else {
        imagePreview.classList.remove('active');
        imagePreview.innerHTML = '';
    }
}

// ===================================
// Gestión de Productos con Firestore
// ===================================
function saveProductToFirestore(product) {
    // Mostrar indicador de carga
    showLoadingMessage('Guardando producto...');

    // Guardar en Firestore
    productsCollection.add(product)
        .then((docRef) => {
            console.log('Producto guardado con ID:', docRef.id);

            // Resetear formulario
            document.getElementById('productForm').reset();
            handleFormReset();

            // Mostrar mensaje de éxito
            showSuccessMessage('Producto registrado exitosamente');

            // Recargar productos
            loadProductsFromFirestore();
        })
        .catch((error) => {
            console.error('Error al guardar producto:', error);
            showErrorMessage('Error al guardar el producto. Intenta de nuevo.');
        });
}

function loadProductsFromFirestore() {
    // Escuchar cambios en tiempo real
    productsCollection.orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
        products = [];
        snapshot.forEach((doc) => {
            products.push({
                id: doc.id,
                ...doc.data()
            });
        });
        renderProducts();
    }, (error) => {
        console.error('Error al cargar productos:', error);
        showErrorMessage('Error al cargar productos de la base de datos');
    });
}

function deleteProduct(productId) {
    // Buscar el producto para obtener su nombre
    const product = products.find(p => p.id === productId);
    const productName = product ? product.name : 'este producto';

    // Confirmar eliminación
    if (!confirm(`¿Estás seguro de eliminar "${productName}"?`)) {
        return;
    }

    // Mostrar indicador de carga
    showLoadingMessage('Eliminando producto...');

    // Eliminar de Firestore
    productsCollection.doc(productId).delete()
        .then(() => {
            console.log('Producto eliminado:', productId);
            showSuccessMessage('Producto eliminado exitosamente');
        })
        .catch((error) => {
            console.error('Error al eliminar producto:', error);
            showErrorMessage('Error al eliminar el producto. Intenta de nuevo.');
        });
}

// Hacer la función global
window.deleteProduct = deleteProduct;

function editProduct(productId) {
    // Buscar el producto
    const product = products.find(p => p.id === productId);
    if (!product) {
        showErrorMessage('Producto no encontrado');
        return;
    }

    // Llenar el formulario con los datos del producto
    document.getElementById('productName').value = product.name;
    document.getElementById('productDescription').value = product.description || '';
    document.getElementById('productQuantity').value = product.quantity;
    document.getElementById('productPrice').value = product.price;
    document.getElementById('productMinStock').value = product.minStock || 10;

    // Mostrar preview de imagen si existe
    if (product.image) {
        const imagePreview = document.getElementById('imagePreview');
        imagePreview.innerHTML = `<img src="${product.image}" alt="Preview">`;
        imagePreview.classList.add('active');
    }

    // Cambiar el comportamiento del formulario para actualizar en lugar de crear
    const form = document.getElementById('productForm');
    const submitButton = form.querySelector('button[type="submit"]');
    const originalButtonHTML = submitButton.innerHTML;

    // Cambiar texto del botón
    submitButton.innerHTML = '<span class="btn-icon">✓</span> Actualizar Producto';
    submitButton.style.background = 'linear-gradient(135deg, #1B3A6B 0%, #0F2847 100%)';
    submitButton.style.color = 'white';

    // Agregar botón de cancelar edición
    const cancelButton = document.createElement('button');
    cancelButton.type = 'button';
    cancelButton.className = 'btn btn-secondary';
    cancelButton.innerHTML = '<span class="btn-icon">✕</span> Cancelar';
    cancelButton.onclick = () => {
        form.reset();
        handleFormReset();
        submitButton.innerHTML = originalButtonHTML;
        submitButton.style.background = '';
        submitButton.style.color = '';
        cancelButton.remove();
        form.dataset.editingId = '';

        // Restaurar el handler original
        form.removeEventListener('submit', handleEditSubmit);
        form.addEventListener('submit', handleFormSubmit);
    };

    const formActions = document.querySelector('.form-actions');
    formActions.insertBefore(cancelButton, formActions.firstChild);

    // Guardar el ID del producto que se está editando
    form.dataset.editingId = productId;

    // Cambiar el event listener del formulario
    form.removeEventListener('submit', handleFormSubmit);
    form.addEventListener('submit', handleEditSubmit);

    // Scroll al formulario
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });

    showSuccessMessage('Editando producto. Modifica los campos y haz clic en "Actualizar Producto"');
}

// Hacer la función global
window.editProduct = editProduct;

function handleEditSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const productId = form.dataset.editingId;

    if (!productId) {
        showErrorMessage('Error: No se encontró el ID del producto');
        return;
    }

    const formData = new FormData(form);
    const imageFile = document.getElementById('productImage').files[0];

    // Crear objeto de producto actualizado
    const updatedProduct = {
        name: formData.get('productName').trim(),
        description: formData.get('productDescription').trim(),
        quantity: parseInt(formData.get('productQuantity')),
        price: parseFloat(formData.get('productPrice')),
        minStock: parseInt(formData.get('productMinStock')) || 10,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };

    // Si hay una nueva imagen, convertirla a base64
    if (imageFile) {
        const reader = new FileReader();
        reader.onload = function (event) {
            updatedProduct.image = event.target.result;
            updateProductInFirestore(productId, updatedProduct, form);
        };
        reader.readAsDataURL(imageFile);
    } else {
        // Mantener la imagen anterior si existe
        const product = products.find(p => p.id === productId);
        if (product && product.image) {
            updatedProduct.image = product.image;
        }
        updateProductInFirestore(productId, updatedProduct, form);
    }
}

function updateProductInFirestore(productId, updatedProduct, form) {
    // Mostrar indicador de carga
    showLoadingMessage('Actualizando producto...');

    // Actualizar en Firestore
    productsCollection.doc(productId).update(updatedProduct)
        .then(() => {
            console.log('Producto actualizado:', productId);

            // Resetear formulario
            form.reset();
            handleFormReset();

            // Restaurar botón original
            const submitButton = form.querySelector('button[type="submit"]');
            submitButton.innerHTML = '<span class="btn-icon">✓</span> Registrar Producto';
            submitButton.style.background = '';
            submitButton.style.color = '';

            // Remover botón de cancelar
            const cancelButton = form.querySelector('.form-actions .btn-secondary');
            if (cancelButton && cancelButton.textContent.includes('Cancelar')) {
                cancelButton.remove();
            }

            // Limpiar el ID de edición
            form.dataset.editingId = '';

            // Restaurar el handler original
            form.removeEventListener('submit', handleEditSubmit);
            form.addEventListener('submit', handleFormSubmit);

            // Mostrar mensaje de éxito
            showSuccessMessage('Producto actualizado exitosamente');
        })
        .catch((error) => {
            console.error('Error al actualizar producto:', error);
            showErrorMessage('Error al actualizar el producto. Intenta de nuevo.');
        });
}

// ===================================
// Renderizado de Productos
// ===================================
function renderProducts() {
    const productsList = document.getElementById('productsList');
    const emptyState = document.getElementById('emptyState');

    // Limpiar lista actual
    productsList.innerHTML = '';

    if (products.length === 0) {
        // Mostrar estado vacío
        emptyState.classList.add('active');
        productsList.style.display = 'none';
    } else {
        // Ocultar estado vacío
        emptyState.classList.remove('active');
        productsList.style.display = 'grid';

        // Renderizar cada producto
        products.forEach(product => {
            const productCard = createProductCard(product);
            productsList.appendChild(productCard);
        });
    }
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.dataset.productId = product.id;

    // Verificar si el stock está bajo
    const isLowStock = product.quantity < (product.minStock || 10);
    if (isLowStock) {
        card.classList.add('low-stock');
    }

    // Imagen del producto
    let imageHTML;
    if (product.image) {
        imageHTML = `<img src="${product.image}" alt="${product.name}" class="product-image">`;
    } else {
        imageHTML = `<div class="product-image placeholder">📦</div>`;
    }

    // Badge de alerta de stock bajo
    const stockAlertHTML = isLowStock
        ? `<div class="stock-alert-badge">⚠️ Stock Bajo</div>`
        : '';

    // Botones de acción
    const actionButtonsHTML = `
        <div class="product-actions">
            <button class="action-btn delete-btn" onclick="deleteProduct('${product.id}')">🗑️</button>
            <button class="action-btn edit-btn" onclick="editProduct('${product.id}')">✏️</button>
        </div>
    `;

    // Descripción (opcional)
    const descriptionHTML = product.description
        ? `<p class="product-description">${escapeHtml(product.description)}</p>`
        : '';

    card.innerHTML = `
        ${actionButtonsHTML}
        ${stockAlertHTML}
        ${imageHTML}
        <div class="product-content">
            <h3 class="product-name">${escapeHtml(product.name)}</h3>
            ${descriptionHTML}
            <div class="product-details">
                <div class="product-quantity">
                    <span class="product-quantity-label">Cantidad</span>
                    <span class="product-quantity-value">${product.quantity}</span>
                </div>
                <div class="product-price">
                    <span class="product-price-label">Precio</span>
                    <span class="product-price-value">$${formatPrice(product.price)}</span>
                </div>
            </div>
        </div>
    `;

    return card;
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
    // Crear elemento de notificación de carga
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

    // Agregar animación
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
    // Ocultar mensaje de carga si existe
    hideLoadingMessage();

    // Crear elemento de notificación
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

    // Remover después de 3 segundos
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
    // Ocultar mensaje de carga si existe
    hideLoadingMessage();

    // Crear elemento de notificación de error
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

    // Remover después de 5 segundos
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentNode) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 5000);
}
