// firebase-config.js
// Configuração do Firebase e inicialização modular do Cloud Firestore com suporte a cache offline
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
    initializeFirestore, 
    persistentLocalCache, 
    persistentMultipleTabManager 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const firebaseConfig = {
    apiKey: "AIzaSyAGGZH_osZtB3TC8pNq1qlGh7OE_GYUQww",
    authDomain: "to-do-d1423.firebaseapp.com",
    projectId: "to-do-d1423",
    storageBucket: "to-do-d1423.firebasestorage.app",
    messagingSenderId: "310838624582",
    appId: "1:310838624582:web:478507de619ba6431f2547"
};

// Inicializa a aplicação Firebase
const app = initializeApp(firebaseConfig);

// Inicializa o Firestore com suporte a persistência offline via IndexedDB
export const db = initializeFirestore(app, {
    localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
    })
});
