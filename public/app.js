// Diamond To-Do - Vanilla JavaScript Application
// Pure JS with Google Cloud Firestore & Firebase Auth (ES Modules)

import { 
    registerUser, 
    loginUser, 
    resetPassword,
    loginWithGoogle,
    logoutUser, 
    initAuthObserver,
    reloadCurrentUser,
    resendVerificationEmail,
    showAuthModal 
} from './auth.js';

import { 
    subscribeToTodos, 
    createTodo, 
    toggleTodoStatus, 
    updateTodoText, 
    deleteTodo,
    clearCompletedTodos 
} from './db.js';

// State
let currentUser = null;
let unsubscribeTodos = null;
let todos = [];
let currentFilter = 'all';
let currentCategory = 'all';
let searchQuery = '';
let isInitialLoading = true;

// UI feedback helpers
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'position-fixed bottom-0 end-0 p-3';
        container.style.zIndex = '1100';
        document.body.appendChild(container);
    }

    const toastEl = document.createElement('div');
    toastEl.className = `toast align-items-center text-bg-${type === 'error' ? 'danger' : 'dark'} border-0 show mb-2`;
    toastEl.role = 'alert';
    toastEl.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                <i class="fa-solid ${type === 'error' ? 'fa-triangle-exclamation text-warning' : 'fa-check text-emerald-glow'} me-2"></i>
                ${escapeHtml(message)}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    container.appendChild(toastEl);
    setTimeout(() => {
        toastEl.remove();
    }, 4000);
}

function showErrorBanner(message) {
    const taskList = document.getElementById('task-list');
    let alertBox = document.getElementById('app-error-alert');
    if (!alertBox && taskList) {
        alertBox = document.createElement('div');
        alertBox.id = 'app-error-alert';
        alertBox.className = 'alert alert-danger alert-dismissible fade show my-3';
        alertBox.role = 'alert';
        taskList.parentElement.insertBefore(alertBox, taskList);
    }
    if (alertBox) {
        alertBox.innerHTML = `
            <strong><i class="fa-solid fa-triangle-exclamation me-1"></i> Erro:</strong> ${escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
        `;
    }
}

function clearErrorBanner() {
    const alertBox = document.getElementById('app-error-alert');
    if (alertBox) alertBox.remove();
}

// Alternar entre Telas de Auth e Aplicação
function toggleAuthViews(user) {
    const authScreen = document.getElementById('auth-screen');
    const appScreen = document.getElementById('app-screen');
    const navUserInfo = document.getElementById('nav-user-info');
    const navAuthBadge = document.getElementById('nav-auth-badge');
    const navUserEmail = document.getElementById('nav-user-email');
    const verificationBanner = document.getElementById('email-verification-banner');

    if (user) {
        // Usuário Conectado -> Mostra To-Do
        if (authScreen) authScreen.classList.add('d-none');
        if (appScreen) appScreen.classList.remove('d-none');
        if (navUserInfo) {
            navUserInfo.classList.remove('d-none');
            navUserInfo.classList.add('d-flex');
        }
        if (navAuthBadge) navAuthBadge.classList.add('d-none');
        if (navUserEmail) {
            navUserEmail.innerHTML = user.emailVerified 
                ? `${escapeHtml(user.email)} <i class="fa-solid fa-circle-check text-emerald-glow ms-1" title="E-mail verificado"></i>`
                : `${escapeHtml(user.email)} <i class="fa-solid fa-clock text-warning ms-1" title="E-mail pendente de verificação"></i>`;
        }

        // Exibe banner caso o e-mail ainda não esteja verificado
        if (verificationBanner) {
            if (!user.emailVerified) {
                verificationBanner.classList.remove('d-none');
            } else {
                verificationBanner.classList.add('d-none');
            }
        }
    } else {
        // Usuário Desconectado -> Mostra Login
        if (authScreen) authScreen.classList.remove('d-none');
        if (appScreen) appScreen.classList.add('d-none');
        if (navUserInfo) {
            navUserInfo.classList.add('d-none');
            navUserInfo.classList.remove('d-flex');
        }
        if (navAuthBadge) navAuthBadge.classList.remove('d-none');
        if (verificationBanner) verificationBanner.classList.add('d-none');
    }
}

// Render tasks and statistics
function render() {
    renderStats();
    renderTasks();
}

// Render Statistics and Progress bar
function renderStats() {
    const totalCount = todos.length;
    const completedCount = todos.filter(t => t.completed).length;
    const pendingCount = totalCount - completedCount;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    const elTotal = document.getElementById('total-tasks-count');
    const elPending = document.getElementById('pending-tasks-count');
    const elCompleted = document.getElementById('completed-tasks-count');
    const elBar = document.getElementById('progress-bar');
    const elLabel = document.getElementById('progress-percent-label');

    if (elTotal) elTotal.textContent = totalCount;
    if (elPending) elPending.textContent = pendingCount;
    if (elCompleted) elCompleted.textContent = completedCount;
    if (elBar) elBar.style.width = `${progressPercent}%`;
    if (elLabel) elLabel.textContent = `${progressPercent}%`;
}

// Filter tasks
function getFilteredTodos() {
    return todos.filter(task => {
        if (currentFilter === 'pending' && task.completed) return false;
        if (currentFilter === 'completed' && !task.completed) return false;
        if (currentCategory !== 'all' && task.category !== currentCategory) return false;
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            return task.text.toLowerCase().includes(query) || (task.category && task.category.toLowerCase().includes(query));
        }
        return true;
    });
}

// Render Task List DOM
function renderTasks() {
    const taskList = document.getElementById('task-list');
    if (!taskList) return;

    if (isInitialLoading) {
        taskList.innerHTML = `
            <div class="empty-state py-5 text-center">
                <div class="spinner-border text-emerald-glow mb-3" style="width: 3rem; height: 3rem;" role="status">
                    <span class="visually-hidden">Carregando...</span>
                </div>
                <h5 class="fw-semibold text-white">Sincronizando tarefas da sua conta...</h5>
                <p class="small text-muted">Buscando dados no Cloud Firestore.</p>
            </div>
        `;
        return;
    }

    const filtered = getFilteredTodos();

    if (filtered.length === 0) {
        taskList.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-gem"></i>
                <h5 class="fw-semibold text-white">Nenhuma tarefa encontrada</h5>
                <p class="small text-muted">Adicione sua primeira tarefa para começar!</p>
            </div>
        `;
        return;
    }

    taskList.innerHTML = filtered.map(task => `
        <div class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="custom-checkbox" data-action="toggle" data-id="${task.id}" data-status="${task.completed}" title="${task.completed ? 'Marcar como pendente' : 'Marcar como concluída'}">
                <i class="fa-solid fa-check"></i>
            </div>
            
            <div class="flex-grow-1 min-w-0">
                <div class="task-text text-break fw-medium mb-1">${escapeHtml(task.text)}</div>
                <div class="d-flex align-items-center flex-wrap gap-2">
                    <span class="category-badge">
                        <i class="fa-solid fa-tag me-1 text-emerald-glow"></i>${escapeHtml(task.category || 'Geral')}
                    </span>
                    <span class="priority-tag ${task.priority}">
                        ${task.priority === 'alta' ? 'Alta' : task.priority === 'media' ? 'Média' : 'Baixa'}
                    </span>
                </div>
            </div>

            <div class="d-flex align-items-center gap-1">
                <button class="task-action-btn" data-action="edit" data-id="${task.id}" title="Editar tarefa">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="task-action-btn delete" data-action="delete" data-id="${task.id}" title="Excluir tarefa">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
    `).join('');
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// Iniciar a aplicação e listeners
document.addEventListener('DOMContentLoaded', () => {
    // 1. OBSERVADOR DE AUTENTICAÇÃO (PERSISTÊNCIA AUTOMÁTICA)
    initAuthObserver(
        (user) => {
            currentUser = user;
            toggleAuthViews(user);
            isInitialLoading = true;
            renderTasks();

            // Cancelar listener anterior se houver
            if (unsubscribeTodos) unsubscribeTodos();

            // Iniciar sincronização das tarefas do usuário autenticado
            unsubscribeTodos = subscribeToTodos(
                user.uid,
                (data) => {
                    isInitialLoading = false;
                    clearErrorBanner();
                    todos = data;
                    render();
                },
                (error) => {
                    isInitialLoading = false;
                    render();
                    showErrorBanner('Erro ao carregar dados do Firestore: ' + (error.message || error.code));
                }
            );
        },
        () => {
            // Deslogado
            currentUser = null;
            todos = [];
            if (unsubscribeTodos) {
                unsubscribeTodos();
                unsubscribeTodos = null;
            }
            toggleAuthViews(null);
        }
    );

    // 2. FORMULÁRIO DE LOGIN
    const formLogin = document.getElementById('form-login');
    const loginEmail = document.getElementById('login-email');
    const loginPassword = document.getElementById('login-password');
    const btnSubmitLogin = document.getElementById('btn-submit-login');

    if (formLogin) {
        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = loginEmail.value.trim();
            const pass = loginPassword.value;
            if (!email || !pass) return;

            btnSubmitLogin.disabled = true;
            btnSubmitLogin.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Autenticando...';

            try {
                await loginUser(email, pass);
                showToast('Login realizado com sucesso!');
                loginPassword.value = '';
            } catch (_) {
                // Erros tratados em auth.js
            } finally {
                btnSubmitLogin.disabled = false;
                btnSubmitLogin.innerHTML = '<i class="fa-solid fa-arrow-right-to-bracket me-1"></i> Entrar na Conta';
            }
        });
    }

    // 3. FORMULÁRIO DE CADASTRO
    const formRegister = document.getElementById('form-register');
    const regEmail = document.getElementById('reg-email');
    const regPassword = document.getElementById('reg-password');
    const btnSubmitRegister = document.getElementById('btn-submit-register');

    if (formRegister) {
        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = regEmail.value.trim();
            const pass = regPassword.value;
            if (!email || !pass) return;

            btnSubmitRegister.disabled = true;
            btnSubmitRegister.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Criando conta...';

            try {
                await registerUser(email, pass);
                showAuthModal(
                    `Enviamos um e-mail de confirmação para ${email}. Por favor, abra o link recebido para validar sua conta.`,
                    false,
                    email,
                    'Conta Criada com Sucesso!',
                    'success'
                );
                showToast('E-mail de confirmação enviado!');
                regPassword.value = '';
            } catch (_) {
                // Erros tratados em auth.js
            } finally {
                btnSubmitRegister.disabled = false;
                btnSubmitRegister.innerHTML = '<i class="fa-solid fa-user-check me-1"></i> Criar Conta Gratuita';
            }
        });
    }

    // 4. ATALHO 'ESQUECEU A SENHA?' NA TELA DE LOGIN
    const linkForgot = document.getElementById('link-forgot-password');
    if (linkForgot) {
        linkForgot.addEventListener('click', () => {
            const tabForgot = document.getElementById('tab-forgot');
            if (tabForgot) tabForgot.click();
            const forgotEmail = document.getElementById('forgot-email');
            const loginEmail = document.getElementById('login-email');
            if (forgotEmail && loginEmail && loginEmail.value) {
                forgotEmail.value = loginEmail.value;
            }
        });
    }

    // 5. FORMULÁRIO DE RECUPERAÇÃO DE SENHA
    const formForgot = document.getElementById('form-forgot');
    const forgotEmail = document.getElementById('forgot-email');
    const btnSubmitForgot = document.getElementById('btn-submit-forgot');

    if (formForgot) {
        formForgot.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = forgotEmail.value.trim();
            if (!email) return;

            btnSubmitForgot.disabled = true;
            btnSubmitForgot.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando link...';

            try {
                await resetPassword(email);
                showAuthModal(
                    `Enviamos um link de redefinição de senha para ${email}. Verifique sua caixa de entrada e siga as instruções.`,
                    false,
                    email,
                    'E-mail Enviado!',
                    'success'
                );
                showToast('Link de recuperação enviado!');
                forgotEmail.value = '';
            } catch (_) {
                // Erros tratados em auth.js
            } finally {
                btnSubmitForgot.disabled = false;
                btnSubmitForgot.innerHTML = '<i class="fa-solid fa-paper-plane me-1"></i> Enviar Link de Recuperação';
            }
        });
    }

    // 6. BOTÃO LOGIN COM GOOGLE
    const btnGoogleLogin = document.getElementById('btn-google-login');
    if (btnGoogleLogin) {
        btnGoogleLogin.addEventListener('click', async () => {
            const originalHtml = btnGoogleLogin.innerHTML;
            btnGoogleLogin.disabled = true;
            btnGoogleLogin.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Conectando ao Google...';

            try {
                await loginWithGoogle();
                showToast('Login com Google realizado com sucesso!');
            } catch (_) {
                // Erros tratados em auth.js
            } finally {
                btnGoogleLogin.disabled = false;
                btnGoogleLogin.innerHTML = originalHtml;
            }
        });
    }

    // 5. BANNER DE VERIFICAÇÃO DE E-MAIL (REVERIFICAR / REENVIAR)
    const btnCheckVerification = document.getElementById('btn-check-verification');
    if (btnCheckVerification) {
        btnCheckVerification.addEventListener('click', async () => {
            btnCheckVerification.disabled = true;
            btnCheckVerification.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Verificando...';

            try {
                const refreshedUser = await reloadCurrentUser();
                if (refreshedUser && refreshedUser.emailVerified) {
                    showToast('E-mail verificado com sucesso! Obrigado!');
                    currentUser = refreshedUser;
                    toggleAuthViews(refreshedUser);
                } else {
                    showAuthModal(
                        'Seu e-mail ainda consta como pendente de verificação. Acesse sua caixa de entrada, clique no link de confirmação do Firebase e depois clique em "Já confirmei".',
                        false,
                        '',
                        'Confirmação Pendente',
                        'error'
                    );
                }
            } catch (err) {
                console.error("Erro ao recarregar status do usuário:", err);
            } finally {
                btnCheckVerification.disabled = false;
                btnCheckVerification.innerHTML = '<i class="fa-solid fa-rotate-right me-1"></i> Já confirmei';
            }
        });
    }

    const btnResendVerification = document.getElementById('btn-resend-verification');
    if (btnResendVerification) {
        btnResendVerification.addEventListener('click', async () => {
            await resendVerificationEmail();
        });
    }

    // 6. BOTÃO DE LOGOUT
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            if (confirm('Deseja realmente sair da sua conta?')) {
                await logoutUser();
                showToast('Você saiu da sua conta.');
            }
        });
    }

    // 5. FORMULÁRIO DE TAREFAS (CRIAR)
    const formTask = document.getElementById('task-form');
    const inputTask = document.getElementById('task-input');
    const categorySelect = document.getElementById('task-category');
    const prioritySelect = document.getElementById('task-priority');
    const submitBtn = formTask?.querySelector('button[type="submit"]');

    if (formTask) {
        formTask.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = inputTask.value.trim();
            if (!text || !currentUser) return;

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';
            }

            try {
                await createTodo({
                    text,
                    category: categorySelect.value,
                    priority: prioritySelect.value,
                    userId: currentUser.uid
                });
                inputTask.value = '';
                inputTask.focus();
                showToast('Tarefa adicionada à sua conta!');
            } catch (err) {
                console.error("Erro ao criar tarefa:", err);
                showToast('Erro ao salvar no Firestore: ' + err.message, 'error');
                showErrorBanner(err.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                }
            }
        });
    }

    // 6. AÇÕES NA LISTA (TOGGLE, EDIT, DELETE)
    const taskList = document.getElementById('task-list');
    if (taskList) {
        taskList.addEventListener('click', async (e) => {
            const actionEl = e.target.closest('[data-action]');
            if (!actionEl) return;

            const action = actionEl.getAttribute('data-action');
            const id = actionEl.getAttribute('data-id');
            const task = todos.find(t => t.id === id);
            if (!task) return;

            try {
                if (action === 'toggle') {
                    await toggleTodoStatus(id, task.completed);
                } else if (action === 'edit') {
                    const newText = prompt('Edite sua tarefa:', task.text);
                    if (newText !== null && newText.trim() !== '') {
                        await updateTodoText(id, newText);
                        showToast('Tarefa atualizada!');
                    }
                } else if (action === 'delete') {
                    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                        await deleteTodo(id);
                        showToast('Tarefa removida.');
                    }
                }
            } catch (err) {
                console.error("Erro na ação:", err);
                showToast('Falha: ' + err.message, 'error');
                showErrorBanner(err.message);
            }
        });
    }

    // 7. FILTROS E BUSCA
    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderTasks();
        });
    });

    const filterCategorySelect = document.getElementById('filter-category');
    if (filterCategorySelect) {
        filterCategorySelect.addEventListener('change', (e) => {
            currentCategory = e.target.value;
            renderTasks();
        });
    }

    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderTasks();
        });
    }

    const clearCompletedBtn = document.getElementById('btn-clear-completed');
    if (clearCompletedBtn) {
        clearCompletedBtn.addEventListener('click', async () => {
            const completedCount = todos.filter(t => t.completed).length;
            if (completedCount === 0) {
                alert('Não há tarefas concluídas para limpar.');
                return;
            }
            if (confirm(`Deseja remover as ${completedCount} tarefas concluídas?`)) {
                try {
                    await clearCompletedTodos(todos);
                    showToast(`${completedCount} tarefas removidas.`);
                } catch (err) {
                    showToast('Erro ao remover: ' + err.message, 'error');
                }
            }
        });
    }
});
