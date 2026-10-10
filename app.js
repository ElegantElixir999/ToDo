// Diamond To-Do - Vanilla JavaScript Application
// Pure JS with localStorage persistence, filters, stats, categories and search

const STORAGE_KEY = 'diamond_todos_app_data';

// Initial state
let todos = [];
let currentFilter = 'all';
let currentCategory = 'all';
let searchQuery = '';

// Load tasks from LocalStorage
function loadTodos() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        if (data) {
            todos = JSON.parse(data);
        } else {
            // Default demo tasks for first time visitors
            todos = [
                {
                    id: '1',
                    text: 'Organizar prioridades do projeto Diamond To-Do',
                    category: 'Trabalho',
                    priority: 'alta',
                    completed: true,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '2',
                    text: 'Revisar paleta de cores verde diamante e cinza escuro',
                    category: 'Design',
                    priority: 'media',
                    completed: false,
                    createdAt: new Date().toISOString()
                },
                {
                    id: '3',
                    text: 'Comprar café e planejar a sprint semanal',
                    category: 'Pessoal',
                    priority: 'baixa',
                    completed: false,
                    createdAt: new Date().toISOString()
                }
            ];
            saveTodos();
        }
    } catch (e) {
        console.error('Erro ao carregar tarefas do LocalStorage', e);
        todos = [];
    }
}

// Save tasks to LocalStorage
function saveTodos() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (e) {
        console.error('Erro ao salvar tarefas', e);
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

    document.getElementById('total-tasks-count').textContent = totalCount;
    document.getElementById('pending-tasks-count').textContent = pendingCount;
    document.getElementById('completed-tasks-count').textContent = completedCount;
    document.getElementById('progress-bar').style.width = `${progressPercent}%`;
    document.getElementById('progress-percent-label').textContent = `${progressPercent}%`;
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
            <div class="custom-checkbox" onclick="toggleTaskStatus('${task.id}')" title="Marcar como concluída">
                <i class="fa-solid fa-check"></i>
            </div>
            
            <div class="flex-grow-1 min-w-0">
                <div class="task-text text-break fw-medium mb-1">${escapeHtml(task.text)}</div>
                <div class="d-flex align-items-center flex-wrap gap-2">
                    <span class="category-badge">
                        <i class="fa-solid fa-tag me-1 text-emerald-glow"></i>${task.category || 'Geral'}
                    </span>
                    <span class="priority-tag ${task.priority}">
                        ${task.priority === 'alta' ? 'Alta' : task.priority === 'media' ? 'Média' : 'Baixa'}
                    </span>
                </div>
            </div>

            <div class="d-flex align-items-center gap-1">
                <button class="task-action-btn" onclick="editTaskPrompt('${task.id}')" title="Editar tarefa">
                    <i class="fa-solid fa-pen-to-square"></i>
                </button>
                <button class="task-action-btn delete" onclick="deleteTask('${task.id}')" title="Excluir tarefa">
                    <i class="fa-solid fa-trash-can"></i>
                </button>
            </div>
        </div>
    `).join('');
}

// Helper to escape HTML characters
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Add new task
function addTask(text, category, priority) {
    if (!text || text.trim() === '') return;

    const newTask = {
        id: Date.now().toString(),
        text: text.trim(),
        category: category || 'Geral',
        priority: priority || 'media',
        completed: false,
        createdAt: new Date().toISOString()
    };

    todos.unshift(newTask);
    saveTodos();
    render();
}

// Toggle status
function toggleTaskStatus(id) {
    const task = todos.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTodos();
        render();
    }
}

// Edit task
function editTaskPrompt(id) {
    const task = todos.find(t => t.id === id);
    if (!task) return;

    const newText = prompt('Edite sua tarefa:', task.text);
    if (newText !== null && newText.trim() !== '') {
        task.text = newText.trim();
        saveTodos();
        render();
    }
}

// Delete single task
function deleteTask(id) {
    if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
        todos = todos.filter(t => t.id !== id);
        saveTodos();
        render();
    }
}

// Clear all completed tasks
function clearCompletedTasks() {
    const completedCount = todos.filter(t => t.completed).length;
    if (completedCount === 0) {
        alert('Não há tarefas concluídas para limpar.');
        return;
    }
    if (confirm(`Deseja remover as ${completedCount} tarefas concluídas?`)) {
        todos = todos.filter(t => !t.completed);
        saveTodos();
        render();
    }
}

// Event Listeners setup
document.addEventListener('DOMContentLoaded', () => {
    loadTodos();
    render();

    // Form submission
    const form = document.getElementById('task-form');
    const input = document.getElementById('task-input');
    const categorySelect = document.getElementById('task-category');
    const prioritySelect = document.getElementById('task-priority');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (text) {
            addTask(text, categorySelect.value, prioritySelect.value);
            input.value = '';
            input.focus();
        }
    });

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
        clearCompletedBtn.addEventListener('click', clearCompletedTasks);
    }
});
