const STORAGE_KEY_USER = 'recurring_tasks_user';
const STORAGE_KEY_TASKS = 'recurring_tasks_list';
const STORAGE_KEY_HISTORY = 'recurring_tasks_history';

export const Storage = {
    getUser: () => {
        return localStorage.getItem(STORAGE_KEY_USER);
    },

    setUser: (name) => {
        localStorage.setItem(STORAGE_KEY_USER, name);
    },

    removeUser: () => {
        localStorage.removeItem(STORAGE_KEY_USER);
    },

    getTasks: () => {
        const tasks = localStorage.getItem(STORAGE_KEY_TASKS);
        return tasks ? JSON.parse(tasks) : [];
    },

    saveTasks: (tasks) => {
        localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(tasks));
    },

    getHistory: () => {
        const history = localStorage.getItem(STORAGE_KEY_HISTORY);
        return history ? JSON.parse(history) : [];
    },

    addToHistory: (entry) => {
        const history = Storage.getHistory();
        history.unshift(entry); // Add to beginning
        localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(history));
    }
};
