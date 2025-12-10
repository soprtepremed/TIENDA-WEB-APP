// Configuración de Autenticación con Supabase
// Este archivo maneja el login y protección de páginas

const AUTH_SUPABASE_URL = 'https://api.premed.mx';
const AUTH_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

// Páginas que no requieren autenticación
const PUBLIC_PAGES = ['login.html'];

// Crear cliente de Supabase para autenticación
let authSupabase;

function initAuthSupabase() {
    if (window.supabase && !authSupabase) {
        authSupabase = window.supabase.createClient(AUTH_SUPABASE_URL, AUTH_SUPABASE_ANON_KEY, {
            db: { schema: 'soporte' }
        });
        console.log('✅ Auth Supabase inicializado');
    }
    return authSupabase;
}

// Verificar si el usuario está autenticado
async function isAuthenticated() {
    initAuthSupabase();

    // Verificar sesión en localStorage
    const session = localStorage.getItem('user_session');
    if (session) {
        try {
            const userData = JSON.parse(session);
            // Verificar que la sesión no haya expirado (24 horas)
            const now = new Date().getTime();
            if (userData.expires && now < userData.expires) {
                return true;
            } else {
                // Sesión expirada
                localStorage.removeItem('user_session');
                return false;
            }
        } catch (e) {
            localStorage.removeItem('user_session');
            return false;
        }
    }
    return false;
}

// Obtener usuario actual
function getCurrentUser() {
    const session = localStorage.getItem('user_session');
    if (session) {
        try {
            return JSON.parse(session);
        } catch (e) {
            return null;
        }
    }
    return null;
}

// Iniciar sesión
async function login(email, password) {
    initAuthSupabase();

    try {
        // Buscar usuario en la tabla de usuarios
        const { data: users, error } = await authSupabase
            .from('usuarios')
            .select('*')
            .eq('email', email.toLowerCase())
            .eq('password', password)
            .eq('activo', true)
            .limit(1);

        if (error) throw error;

        if (!users || users.length === 0) {
            throw new Error('Credenciales incorrectas');
        }

        const user = users[0];

        // Guardar sesión (24 horas)
        const sessionData = {
            id: user.id,
            email: user.email,
            nombre: user.nombre,
            rol: user.rol,
            loginTime: new Date().getTime(),
            expires: new Date().getTime() + (24 * 60 * 60 * 1000) // 24 horas
        };

        localStorage.setItem('user_session', JSON.stringify(sessionData));

        return { success: true, user: sessionData };

    } catch (error) {
        console.error('Error de login:', error);
        return { success: false, error: error.message };
    }
}

// Cerrar sesión
function logout() {
    localStorage.removeItem('user_session');
    window.location.href = 'login.html';
}

// Proteger página (redirigir si no está autenticado)
async function protectPage() {
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    // Si es una página pública, no proteger
    if (PUBLIC_PAGES.includes(currentPage)) {
        return;
    }

    // Verificar autenticación
    const authenticated = await isAuthenticated();

    if (!authenticated) {
        // Redirigir a login
        window.location.href = 'login.html';
    }
}

// Manejar formulario de login
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');

    if (loginForm) {
        // Si ya está autenticado, redirigir a index
        isAuthenticated().then(auth => {
            if (auth) {
                window.location.href = 'index.html';
            }
        });

        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const btnLogin = document.getElementById('btnLogin');
            const errorMessage = document.getElementById('errorMessage');

            // Mostrar loading
            btnLogin.classList.add('loading');
            btnLogin.disabled = true;
            errorMessage.classList.remove('show');

            try {
                const result = await login(email, password);

                if (result.success) {
                    // Redirigir a la página principal
                    window.location.href = 'index.html';
                } else {
                    // Mostrar error
                    errorMessage.textContent = result.error || 'Error al iniciar sesión';
                    errorMessage.classList.add('show');
                }
            } catch (error) {
                errorMessage.textContent = 'Error de conexión. Intenta de nuevo.';
                errorMessage.classList.add('show');
            } finally {
                btnLogin.classList.remove('loading');
                btnLogin.disabled = false;
            }
        });
    }
});

// Exponer funciones globalmente
window.isAuthenticated = isAuthenticated;
window.getCurrentUser = getCurrentUser;
window.login = login;
window.logout = logout;
window.protectPage = protectPage;
