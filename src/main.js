import { Storage } from './storage.js';
import { Alarm } from './alarm.js';

// State
let currentUser = null;
let tasks = [];
let history = [];
let activeAlarmTask = null; // The task currently ringing

// DOM Elements
const app = document.getElementById('app');
const loginView = document.getElementById('login-view');
const dashboardView = document.getElementById('dashboard-view');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const userDisplay = document.getElementById('user-display');
const btnLogout = document.getElementById('btn-logout');
const taskForm = document.getElementById('task-form');
const tasksList = document.getElementById('tasks-list');
const historyList = document.getElementById('history-list');
const alarmOverlay = document.getElementById('alarm-overlay');
const alarmTaskName = document.getElementById('alarm-task-name');
const btnSnooze = document.getElementById('btn-snooze');
const btnComplete = document.getElementById('btn-complete');
const taskRecurrence = document.getElementById('task-recurrence');
const customDaysContainer = document.getElementById('custom-days-container');

// Initialization
function init() {
  currentUser = Storage.getUser();
  tasks = Storage.getTasks();
  history = Storage.getHistory();

  if (currentUser) {
    showDashboard();
  } else {
    showLogin();
  }

  renderTasks();
  renderHistory();

  // Start Alarm Loop
  setInterval(checkAlarms, 1000);
}

// Navigation
function showLogin() {
  loginView.classList.remove('hidden');
  dashboardView.classList.add('hidden');
}

function showDashboard() {
  loginView.classList.add('hidden');
  dashboardView.classList.remove('hidden');
  userDisplay.textContent = currentUser;
}

// Event Listeners
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = usernameInput.value.trim();
  if (name) {
    currentUser = name;
    Storage.setUser(name);
    showDashboard();
  }
});

btnLogout.addEventListener('click', () => {
  if (confirm('¿Quieres cerrar sesión?')) {
    currentUser = null;
    Storage.removeUser();
    showLogin();
    loginForm.reset();
  }
});

// Toggle Custom Days visibility
taskRecurrence.addEventListener('change', (e) => {
  if (e.target.value === 'custom') {
    customDaysContainer.classList.remove('hidden');
  } else {
    customDaysContainer.classList.add('hidden');
  }
});

taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const name = document.getElementById('task-name').value.trim();
  const time = document.getElementById('task-time').value;
  const startDate = document.getElementById('task-start-date').value;
  const recurrenceType = document.getElementById('task-recurrence').value;

  let days = [];
  if (recurrenceType === 'custom') {
    const checkboxes = document.querySelectorAll('input[name="day"]:checked');
    days = Array.from(checkboxes).map(cb => parseInt(cb.value));
    if (days.length === 0) {
      alert('Para recurrencia personalizada, selecciona al menos un día.');
      return;
    }
  }

  if (!name || !time || !startDate) {
    alert('Por favor completa todos los campos.');
    return;
  }

  const newTask = {
    id: Date.now().toString(),
    name,
    time,
    startDate,
    recurrenceType,
    customDays: days,
    lastCompleted: null
  };

  tasks.push(newTask);
  Storage.saveTasks(tasks);
  renderTasks();
  taskForm.reset();
  customDaysContainer.classList.add('hidden'); // Reset visibility
});

// Rendering
function renderTasks() {
  tasksList.innerHTML = '';
  if (tasks.length === 0) {
    tasksList.innerHTML = '<p style="color: var(--text-secondary); font-style: italic;">No hay tareas activas.</p>';
    return;
  }

  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  tasks.forEach(task => {
    const taskEl = document.createElement('div');
    taskEl.className = 'card';
    taskEl.style.padding = 'var(--spacing-md)';
    taskEl.style.display = 'flex';
    taskEl.style.justifyContent = 'space-between';
    taskEl.style.alignItems = 'center';

    const daysStr = getRecurrenceLabel(task);

    taskEl.innerHTML = `
      <div>
        <h4 style="font-weight: 600; margin-bottom: 4px;">${task.name}</h4>
        <p style="font-size: 0.875rem; color: var(--text-secondary);">
          <span style="color: var(--accent-color); font-weight: 500;">${task.time}</span> • ${daysStr}
        </p>
      </div>
      <button class="btn btn-danger" style="padding: 4px 8px; font-size: 0.75rem;" onclick="deleteTask('${task.id}')">Eliminar</button>
    `;
    tasksList.appendChild(taskEl);
  });
}

function getRecurrenceLabel(task) {
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  if (task.recurrenceType === 'daily') return 'Diaria';
  if (task.recurrenceType === 'weekly') return 'Semanal';
  if (task.recurrenceType === 'monthly') return 'Mensual';
  if (task.recurrenceType === 'custom') {
    return 'Personalizada: ' + task.customDays.map(d => dayNames[d]).join(', ');
  }
  // Legacy fallback
  if (task.days) return task.days.map(d => dayNames[d]).join(', ');
  return '';
}

// Expose deleteTask to window so onclick works
window.deleteTask = (id) => {
  if (confirm('¿Estás seguro de eliminar esta tarea?')) {
    tasks = tasks.filter(t => t.id !== id);
    Storage.saveTasks(tasks);
    renderTasks();
  }
};

function renderHistory() {
  historyList.innerHTML = '';
  if (history.length === 0) {
    historyList.innerHTML = '<tr><td colspan="3" style="padding: var(--spacing-md); text-align: center; color: var(--text-secondary);">Sin historial reciente</td></tr>';
    return;
  }

  history.forEach(entry => {
    const row = document.createElement('tr');
    row.style.borderBottom = '1px solid var(--border-color)';

    const date = new Date(entry.completedAt);
    const timeStr = date.toLocaleTimeString();
    const dateStr = date.toLocaleDateString();

    row.innerHTML = `
      <td style="padding: var(--spacing-md);">${entry.taskName}</td>
      <td style="padding: var(--spacing-md); color: var(--text-secondary);">${dateStr} ${timeStr}</td>
      <td style="padding: var(--spacing-md); color: var(--accent-color);">${entry.user}</td>
    `;
    historyList.appendChild(row);
  });
}

// Alarm Logic
let snoozedTasks = {}; // Map of taskId -> snoozeUntil (timestamp)

function checkAlarms() {
  if (activeAlarmTask) return; // Already ringing

  const now = new Date();
  const triggered = Alarm.check(tasks);

  triggered.forEach(task => {
    // Check if snoozed
    if (snoozedTasks[task.id] && now.getTime() < snoozedTasks[task.id]) {
      return;
    }

    // Check if already completed today
    if (task.lastCompleted) {
      const last = new Date(task.lastCompleted);
      if (last.toDateString() === now.toDateString()) {
        return; // Already done today
      }
    }

    // Trigger Alarm
    triggerAlarm(task);
  });
}

function triggerAlarm(task) {
  activeAlarmTask = task;
  alarmTaskName.textContent = task.name;
  alarmOverlay.classList.remove('hidden');
  // Optional: Play sound here if requested (not in spec but good for alarms)
}

btnSnooze.addEventListener('click', () => {
  if (!activeAlarmTask) return;

  // Snooze for 5 minutes
  const snoozeTime = 5 * 60 * 1000;
  snoozedTasks[activeAlarmTask.id] = Date.now() + snoozeTime;

  closeAlarm();
});

btnComplete.addEventListener('click', () => {
  if (!activeAlarmTask) return;

  // Mark as completed
  const now = new Date();

  // Update task lastCompleted
  const taskIndex = tasks.findIndex(t => t.id === activeAlarmTask.id);
  if (taskIndex !== -1) {
    tasks[taskIndex].lastCompleted = now.getTime();
    Storage.saveTasks(tasks);
  }

  // Add to history
  const entry = {
    taskName: activeAlarmTask.name,
    completedAt: now.getTime(),
    user: currentUser
  };
  Storage.addToHistory(entry);

  // Update UI
  renderHistory();

  closeAlarm();
});

function closeAlarm() {
  activeAlarmTask = null;
  alarmOverlay.classList.add('hidden');
}

// Start
init();
