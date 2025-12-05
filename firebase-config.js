// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAsmY4X7OjzK-zF9w6CusNU3YwLQJuPjPg",
    authDomain: "tienda-web-premed.firebaseapp.com",
    projectId: "tienda-web-premed",
    storageBucket: "tienda-web-premed.firebasestorage.app",
    messagingSenderId: "762974599150",
    appId: "1:762974599150:web:1da500efe14987315040ff",
    measurementId: "G-PWLG4DYVKN"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Inicializar Firestore
const db = firebase.firestore();

// Referencia a la colección de productos
const productsCollection = db.collection('productos');
