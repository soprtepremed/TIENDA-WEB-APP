import { useState, useEffect } from 'react';
import './App.css';
import { UserLogin } from './components/UserLogin';
import { Dashboard } from './components/Dashboard';
import { AlertOverlay } from './components/AlertOverlay';
import { HistoryLog } from './components/HistoryLog';
import { storage } from './services/storage';

function App() {
  const [user, setUser] = useState(null);
  const [alertEvent, setAlertEvent] = useState(null);
  const [view, setView] = useState('dashboard'); // dashboard, history

  useEffect(() => {
    const storedUser = storage.getUser();
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  useEffect(() => {
    if (!user) return;

    // Check for alerts immediately and then every minute
    checkAlerts();
    const interval = setInterval(checkAlerts, 60000);
    return () => clearInterval(interval);
  }, [user]);

  const checkAlerts = () => {
    const events = storage.getEvents();
    const now = new Date();

    // Find the most urgent event
    const urgentEvent = events.find(e => {
      if (e.status === 'completed') return false;
      if (e.snoozeUntil && new Date(e.snoozeUntil) > now) return false;

      // Parse due date (YYYY-MM-DD) as local time
      const [year, month, day] = e.dueDate.split('-').map(Number);
      const dueDate = new Date(year, month - 1, day);

      // Calculate difference in days
      const diffTime = dueDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Alert if due in 2 days or less (including overdue)
      return diffDays <= 2;
    });

    setAlertEvent(urgentEvent || null);
  };

  const handleLogin = (name) => {
    storage.setUser(name);
    setUser(name);
  };

  const handleCompleteEvent = (event) => {
    const events = storage.getEvents();
    const history = storage.getHistory();
    const now = new Date().toISOString();

    // Update event status
    const updatedEvents = events.map(e => {
      if (e.id === event.id) {
        // Handle recurrence
        if (e.recurrence !== 'none') {
          // Calculate next due date
          const [year, month, day] = e.dueDate.split('-').map(Number);
          const currentDueDate = new Date(year, month - 1, day);
          let nextDate = new Date(currentDueDate);

          if (e.recurrence === 'daily') nextDate.setDate(nextDate.getDate() + 1);
          if (e.recurrence === 'weekly') nextDate.setDate(nextDate.getDate() + 7);
          if (e.recurrence === 'monthly') nextDate.setMonth(nextDate.getMonth() + 1);

          return {
            ...e,
            dueDate: nextDate.toISOString().split('T')[0],
            snoozeUntil: null
          };
        } else {
          return { ...e, status: 'completed' };
        }
      }
      return e;
    });

    // Add to history
    const newHistoryEntry = {
      id: Date.now().toString(),
      eventId: event.id,
      eventTitle: event.title,
      completedBy: user,
      completedAt: now,
      action: 'completed'
    };

    storage.saveEvents(updatedEvents);
    storage.saveHistory([...history, newHistoryEntry]);

    setAlertEvent(null);
    // Force re-render of dashboard if needed (Dashboard fetches on mount, but we might need to trigger update)
    // For simplicity, we rely on Dashboard reloading or we could pass events down.
    // Ideally Dashboard should listen to storage or we lift state up. 
    // Since Dashboard fetches on mount, we'll force a page reload or just let it be for now.
    // Better: Lift events state to App, but for now let's just re-check alerts.
    checkAlerts();
    window.location.reload(); // Simple way to refresh Dashboard
  };

  const handleSnooze = (event) => {
    const events = storage.getEvents();
    const now = new Date();
    // Snooze for 1 hour
    const snoozeUntil = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

    const updatedEvents = events.map(e =>
      e.id === event.id ? { ...e, snoozeUntil } : e
    );

    storage.saveEvents(updatedEvents);
    setAlertEvent(null);
  };

  const handleLogout = () => {
    storage.setUser('');
    setUser(null);
  };

  if (!user) {
    return <UserLogin onLogin={handleLogin} />;
  }

  return (
    <div className="app-container">
      {alertEvent && (
        <AlertOverlay
          event={alertEvent}
          onComplete={handleCompleteEvent}
          onSnooze={handleSnooze}
        />
      )}

      <Dashboard user={user} onLogout={handleLogout} />

      <HistoryLog />
    </div>
  );
}

export default App;
