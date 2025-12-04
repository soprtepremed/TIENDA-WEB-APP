import { useState, useEffect } from 'react';
import { CheckCircle, User, Calendar } from 'lucide-react';
import { storage } from '../services/storage';

export function HistoryLog() {
    const [history, setHistory] = useState([]);

    useEffect(() => {
        setHistory(storage.getHistory().reverse()); // Newest first
    }, []);

    const formatDate = (isoString) => {
        return new Date(isoString).toLocaleString();
    };

    return (
        <div className="glass-panel" style={{ marginTop: '2rem' }}>
            <h2 style={{ textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CheckCircle size={24} color="var(--accent-primary)" /> Historial de Actividades
            </h2>

            {history.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No hay actividades registradas aún.</p>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {history.map((entry) => (
                        <div key={entry.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                            padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '8px',
                            textAlign: 'left'
                        }}>
                            <div>
                                <h4 style={{ margin: '0 0 4px 0' }}>{entry.eventTitle}</h4>
                                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <User size={12} /> {entry.completedBy}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Calendar size={12} /> {formatDate(entry.completedAt)}
                                    </span>
                                </div>
                            </div>
                            <div style={{
                                background: 'rgba(34, 197, 94, 0.2)', color: '#4ade80',
                                padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: 'bold'
                            }}>
                                COMPLETADO
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
