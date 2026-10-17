// Diamond To-Do - Vanilla JavaScript Application
// Pure JS with Google Cloud Firestore Persistence (ES Modules)

import { 
    subscribeToTodos, 
    createTodo, 
    toggleTodoStatus, 
    updateTodoText, 
    deleteTodo,
    clearCompletedTodos 
} from './db.js';

// Initial state
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
            <strong><i class="fa-solid fa-triangle-exclamation me-1"></i> Erro do Firestore:</strong> ${escapeHtml(message)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
        `;
    }
}

function clearErrorBanner() {
    const alertBox = document.getElementById('app-error-alert');
    if (alertBox) alertBox.remove();
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
        // Status filter
        if (currentFilter === 'pending' && task.completed) return false;
        if (currentFilter === 'completed' && !task.completed) return false;

        // Category filter
        if (currentCategory !== 'all' && task.category !== currentCategory) return false;

        // Search query
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
                    <span class="visually-hidden">Conectando ao Firestore...</span>
                </div>
                <h5 class="fw-semibold text-white">Sincronizando com o Cloud Firestore</h5>
                <p class="small text-muted">Carregando suas tarefas persistentes...</p>
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
                <p class="small text-muted">Adicione uma nova tarefa ou ajuste os filtros para ver suas atividades.</p>
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

// Helper to escape HTML characters
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

// Event Listeners setup
document.addEventListener('DOMContentLoaded', () => {
    const taskList = document.getElementById('task-list');
    renderTasks();

    // Inicia subscrição em tempo real com o Firestore
    subscribeToTodos(
        (data) => {
            isInitialLoading = false;
            clearErrorBanner();
            todos = data;
            render();
        },
        (error) => {
            isInitialLoading = false;
            render();
            let msg = error.message;
            if (error.code === 'permission-denied') {
                msg = 'Permissão negada. Verifique as Regras de Segurança (Rules) do seu Cloud Firestore no Firebase Console.';
            } else if (error.code === 'unavailable') {
                msg = 'O serviço do Firestore está temporariamente inacessível ou sem internet. O cache offline manterá seus dados locais.';
            }
            showErrorBanner(msg);
        }
    );

    // Form submission (Criar tarefa)
    const form = document.getElementById('task-form');
    const input = document.getElementById('task-input');
    const categorySelect = document.getElementById('task-category');
    const prioritySelect = document.getElementById('task-priority');
    const submitBtn = form?.querySelector('button[type="submit"]');

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = input.value.trim();
            if (!text) return;

            // Loading feedback no botão
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span>';
            }

            try {
                await createTodo({
                    text,
                    category: categorySelect.value,
                    priority: prioritySelect.value
                });
                input.value = '';
                input.focus();
                showToast('Tarefa salva com sucesso no Firestore!');
            } catch (err) {
                console.error("Erro ao criar tarefa:", err);
                showToast(err.code === 'permission-denied' ? 'Permissão negada no Firestore!' : 'Erro ao criar tarefa', 'error');
                showErrorBanner(err.message);
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                }
            }
        });
    }

    // Delegação de eventos da lista de tarefas (Toggle, Edit, Delete)
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
                        showToast('Tarefa removida do Firestore.');
                    }
                }
            } catch (err) {
                console.error("Erro na ação:", err);
                showToast('Falha ao processar: ' + (err.message || 'Erro de rede'), 'error');
                showErrorBanner(err.message);
            }
        });
    }

    // Filter status buttons
    const filterButtons = document.querySelectorAll('[data-filter]');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentFilter = btn.getAttribute('data-filter');
            renderTasks();
        });
    });

    // Category filter dropdown
    const filterCategorySelect = document.getElementById('filter-category');
    if (filterCategorySelect) {
        filterCategorySelect.addEventListener('change', (e) => {
            currentCategory = e.target.value;
            renderTasks();
        });
    }

    // Search input
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            renderTasks();
        });
    }

    // Clear completed button
    const clearCompletedBtn = document.getElementById('btn-clear-completed');
    if (clearCompletedBtn) {
        clearCompletedBtn.addEventListener('click', async () => {
            const completedCount = todos.filter(t => t.completed).length;
            if (completedCount === 0) {
                alert('Não há tarefas concluídas para limpar.');
                return;
            }
            if (confirm(`Deseja remover as ${completedCount} tarefas concluídas do banco de dados?`)) {
                try {
                    await clearCompletedTodos(todos);
                    showToast(`${completedCount} tarefas concluídas foram removidas.`);
                } catch (err) {
                    console.error("Erro ao limpar concluídas:", err);
                    showToast('Erro ao remover tarefas: ' + err.message, 'error');
                }
            }
        });
    }
});
