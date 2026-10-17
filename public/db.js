// db.js
// Módulo de serviço do Firestore para o Diamond To-Do
import { db } from './firebase-config.js';
import { 
    collection, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    doc, 
    query, 
    orderBy, 
    onSnapshot,
    serverTimestamp,
    writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

const TODOS_COLLECTION = 'todos';

/**
 * Escuta as alterações na coleção de tarefas em tempo real.
 * @param {Function} onDataCallback - Chamada sempre que as tarefas forem carregadas/atualizadas.
 * @param {Function} onErrorCallback - Chamada em caso de erro de conexão ou permissão.
 * @returns {Function} Função para cancelar o listener (unsubscribe).
 */
export function subscribeToTodos(onDataCallback, onErrorCallback) {
    const q = query(
        collection(db, TODOS_COLLECTION),
        orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snapshot) => {
        const tasks = snapshot.docs.map(docSnap => {
            const data = docSnap.data();
            let date = new Date();
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
                date = data.createdAt.toDate();
            } else if (data.createdAt) {
                date = new Date(data.createdAt);
            }

            return {
                id: docSnap.id,
                text: data.text || '',
                category: data.category || 'Geral',
                priority: data.priority || 'media',
                completed: Boolean(data.completed),
                createdAt: date
            };
        });
        onDataCallback(tasks);
    }, (error) => {
        console.error("Erro no listener do Firestore:", error);
        if (onErrorCallback) onErrorCallback(error);
    });
}

/**
 * Cria uma nova tarefa no Firestore.
 */
export async function createTodo({ text, category, priority }) {
    return await addDoc(collection(db, TODOS_COLLECTION), {
        text: text.trim(),
        category: category || 'Geral',
        priority: priority || 'media',
        completed: false,
        createdAt: serverTimestamp()
    });
}

/**
 * Alterna o estado de conclusão de uma tarefa.
 */
export async function toggleTodoStatus(id, currentStatus) {
    const docRef = doc(db, TODOS_COLLECTION, id);
    return await updateDoc(docRef, {
        completed: !currentStatus
    });
}

/**
 * Atualiza o texto de uma tarefa existente.
 */
export async function updateTodoText(id, newText) {
    const docRef = doc(db, TODOS_COLLECTION, id);
    return await updateDoc(docRef, {
        text: newText.trim()
    });
}

/**
 * Deleta uma tarefa específica pelo ID.
 */
export async function deleteTodo(id) {
    const docRef = doc(db, TODOS_COLLECTION, id);
    return await deleteDoc(docRef);
}

/**
 * Exclui em lote todas as tarefas concluídas.
 */
export async function clearCompletedTodos(tasks) {
    const completedTasks = tasks.filter(t => t.completed);
    if (completedTasks.length === 0) return 0;

    const batch = writeBatch(db);
    completedTasks.forEach(t => {
        batch.delete(doc(db, TODOS_COLLECTION, t.id));
    });

    await batch.commit();
    return completedTasks.length;
}
