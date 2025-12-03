import { useState, useEffect } from 'react';
import { Plus, Calendar, Clock } from 'lucide-react';
import { storage } from '../services/storage';
import { EventForm } from './EventForm';

export function Dashboard({ user, onLogout }) {
    const [events, setEvents] = useState([]);
    const [showForm, setShowForm] = useState(false);

    useEffect(() => {
        loadEvents();
    }, []);

    const loadEvents = () => {
        setEvents(storage.getEvents());
    };

    const handleCreateEvent = (newEvent) => {
        const updatedEvents = [...events, newEvent];
        storage.saveEvents(updatedEvents);
        setEvents(updatedEvents);
        setShowForm(false);
    };

    const formatDate = (dateStr, timeStr) => {
        if (!dateStr) return 'Sin fecha';
        const date = new Date(dateStr).toLocaleDateString();
        return timeStr ? `${date} a las ${timeStr}` : date;
    };

    return (
        <div style={{ paddingBottom: '80px' }}>
            <header style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '2rem'
            }}>
                <div style={{ textAlign: 'left' }}>
                    <h1 style={{ margin: 0, fontSize: '1.8rem', color: 'var(--accent-primary)' }}>Panel de Control</h1>
                    <p style={{ color: 'var(--text-secondary)', margin: 0 }}>Hola, {user}</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button className="btn-secondary" onClick={onLogout}>
                        Cerrar Sesión
                    </button>
                    <button className="btn" onClick={() => setShowForm(true)} style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                        <Plus size={18} /> Nuevo Evento
                    </button>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                {events.length === 0 ? (
                    <div className="glass-panel" style={{ gridColumn: '1/-1', padding: '3rem', textAlign: 'center' }}>
                        <Calendar size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem' }} />
                        <h3>No hay eventos programados</h3>
                        <p style={{ color: 'var(--text-secondary)' }}>Crea tu primer evento para comenzar a recibir alertas.</p>
                    </div>
                ) : (
                    events.map(event => (
                        <div key={event.id} className="glass-panel" style={{ textAlign: 'left', position: 'relative', overflow: 'hidden' }}>
                            <div style={{
                                position: 'absolute', top: 0, left: 0, width: '4px', bottom: 0,
                                background: 'linear-gradient(to bottom, var(--accent-primary), var(--accent-gold))'
                            }} />
                            <h3 style={{ margin: '0 0 0.5rem 0' }}>{event.title}</h3>
                            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                {event.description}
                            </p>
                            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Calendar size={14} /> {formatDate(event.dueDate, event.dueTime)}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Clock size={14} /> {event.recurrence === 'none' ? 'Una vez' : event.recurrence}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showForm && (
                <EventForm
                    onClose={() => setShowForm(false)}
                    onSave={handleCreateEvent}
                />
            )}
        </div>
    );
}
