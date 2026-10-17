// auth.js
// Módulo de Autenticação com Firebase Authentication (E-mail/Senha, Verificação de E-mail e Google)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    sendEmailVerification,
    sendPasswordResetEmail,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

const firebaseConfig = {
    apiKey: "AIzaSyAGGZH_osZtB3TC8pNq1qlGh7OE_GYUQww",
    authDomain: "to-do-d1423.firebaseapp.com",
    projectId: "to-do-d1423",
    storageBucket: "to-do-d1423.firebasestorage.app",
    messagingSenderId: "310838624582",
    appId: "1:310838624582:web:478507de619ba6431f2547"
};

// Inicializa o app e auth
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

/**
 * Enviar e-mail para redefinição de senha
 */
export async function resetPassword(email) {
    try {
        await sendPasswordResetEmail(auth, email.trim());
        return true;
    } catch (error) {
        handleAuthError(error, 'reset', email);
        throw error;
    }
}

/**
 * Cadastrar novo usuário com e-mail e senha
 * Envia automaticamente e-mail de verificação para o endereço informado
 */
export async function registerUser(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        // Dispara o e-mail de verificação do Firebase
        await sendEmailVerification(user);

        return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            emailVerified: user.emailVerified
        };
    } catch (error) {
        handleAuthError(error, 'cadastro', email);
        throw error;
    }
}

/**
 * Reenviar e-mail de verificação para o usuário atual
 */
export async function resendVerificationEmail() {
    if (auth.currentUser) {
        try {
            await sendEmailVerification(auth.currentUser);
            alert("Novo e-mail de confirmação enviado! Por favor, verifique sua caixa de entrada e spam.");
        } catch (err) {
            console.error("Erro ao reenviar e-mail de verificação:", err);
            alert("Não foi possível reenviar o e-mail agora. Aguarde alguns instantes.");
        }
    } else {
        alert("Nenhum usuário logado para reenviar a verificação.");
    }
}

/**
 * Recarregar os dados do usuário para verificar se o e-mail já foi validado
 */
export async function reloadCurrentUser() {
    if (auth.currentUser) {
        await auth.currentUser.reload();
        return {
            uid: auth.currentUser.uid,
            email: auth.currentUser.email,
            displayName: auth.currentUser.displayName,
            emailVerified: auth.currentUser.emailVerified
        };
    }
    return null;
}

/**
 * Login com e-mail e senha
 */
export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;
        return {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName,
            emailVerified: user.emailVerified
        };
    } catch (error) {
        handleAuthError(error, 'login', email);
        throw error;
    }
}

/**
 * Login com Google (Popup)
 */
export async function loginWithGoogle() {
    try {
        const result = await signInWithPopup(auth, googleProvider);
        return {
            uid: result.user.uid,
            email: result.user.email,
            displayName: result.user.displayName,
            emailVerified: result.user.emailVerified
        };
    } catch (error) {
        handleAuthError(error, 'google');
        throw error;
    }
}

/**
 * Logout
 */
export async function logoutUser() {
    try {
        await signOut(auth);
    } catch (error) {
        console.error("Erro ao deslogar:", error);
        alert("Erro ao encerrar a sessão.");
        throw error;
    }
}

/**
 * Observador de estado de autenticação (persiste sessão após recarregar a página)
 */
export function initAuthObserver(onUserLoggedIn, onUserLoggedOut) {
    return onAuthStateChanged(auth, (user) => {
        if (user) {
            onUserLoggedIn({
                uid: user.uid,
                email: user.email,
                displayName: user.displayName,
                emailVerified: user.emailVerified
            });
        } else {
            onUserLoggedOut();
        }
    });
}

/**
 * Exibe o Modal customizado no padrão dark do projeto
 */
export function showAuthModal(message, showRegisterAction = false, email = '', title = 'Acesso Negado', type = 'error') {
    const modalEl = document.getElementById('authErrorModal');
    const titleEl = document.getElementById('authErrorModalLabel');
    const msgEl = document.getElementById('authErrorModalMessage');
    const actionBtn = document.getElementById('btn-modal-action');
    const iconContainer = modalEl?.querySelector('.modal-header .rounded-circle');

    if (titleEl) {
        titleEl.textContent = title;
    }

    if (msgEl) {
        msgEl.textContent = message;
    }

    if (iconContainer) {
        if (type === 'success') {
            iconContainer.className = 'p-2 rounded-circle bg-success bg-opacity-25 text-emerald-glow d-flex align-items-center justify-content-center';
            iconContainer.innerHTML = '<i class="fa-solid fa-circle-check small"></i>';
        } else {
            iconContainer.className = 'p-2 rounded-circle bg-danger bg-opacity-25 text-danger d-flex align-items-center justify-content-center';
            iconContainer.innerHTML = '<i class="fa-solid fa-triangle-exclamation small"></i>';
        }
    }

    if (actionBtn) {
        if (showRegisterAction) {
            actionBtn.classList.remove('d-none');
            actionBtn.onclick = () => {
                const registerTab = document.getElementById('tab-register');
                if (registerTab) registerTab.click();
                const regEmail = document.getElementById('reg-email');
                if (regEmail && email) regEmail.value = email;

                if (window.bootstrap && modalEl) {
                    const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
                    if (modalInstance) modalInstance.hide();
                }
            };
        } else {
            actionBtn.classList.add('d-none');
        }
    }

    if (window.bootstrap && modalEl) {
        const modalInstance = window.bootstrap.Modal.getOrCreateInstance(modalEl);
        modalInstance.show();
    }
}

/**
 * Tratamento de erros customizados com Modal
 */
function handleAuthError(error, context = 'login', email = '') {
    const code = error.code;
    console.error(`[Auth Error - ${context}]:`, code, error.message);

    switch (code) {
        case 'auth/popup-closed-by-user':
            console.warn("Popup do Google fechado antes da conclusão.");
            break;

        case 'auth/cancelled-popup-request':
            break;

        case 'auth/popup-blocked':
            showAuthModal("A janela de login do Google foi bloqueada pelo navegador. Permita pop-ups para este site.");
            break;

        case 'auth/user-not-found':
            showAuthModal("Usuário não encontrado. Deseja criar uma conta agora?", true, email);
            break;

        case 'auth/wrong-password':
        case 'auth/invalid-credential':
            showAuthModal("Login ou senha incorretos! Verifique seus dados e tente novamente.");
            break;

        case 'auth/invalid-email':
            showAuthModal("O formato do e-mail digitado é inválido.");
            break;

        case 'auth/email-already-in-use':
            showAuthModal("Este e-mail já está cadastrado em outra conta. Faça login ou recupere sua senha.");
            break;

        case 'auth/weak-password':
            showAuthModal("A senha informada é fraca. A senha precisa conter no mínimo 6 caracteres.");
            break;

        case 'auth/too-many-requests':
            showAuthModal("Muitas tentativas consecutivas sem sucesso. Por segurança, aguarde alguns instantes antes de tentar novamente.");
            break;

        default:
            showAuthModal("Erro ao autenticar: " + (error.message || "Por favor, tente novamente mais tarde."));
            break;
    }
}

