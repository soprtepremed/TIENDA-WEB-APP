
import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react';

export function AlertOverlay({ event, onComplete, onSnooze }) {
    const [visible, setVisible] = useState(true);

    // Flashing effect is handled by CSS animation 'animate-pulse-red' on the container

    if (!event) return null;

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(239, 68, 68, 0.9)', // Strong red background
            zIndex: 9999,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            animation: 'pulse-red 2s infinite' // Custom pulse animation defined in index.css
        }}>
            <div className="glass-panel" style={{
                background: 'rgba(0, 0, 0, 0.8)',
                border: '2px solid #fff',
                maxWidth: '600px', width: '90%',
                textAlign: 'center',
                padding: '3rem',
                boxShadow: '0 0 50px rgba(0,0,0,0.5)'
            }}>
                <AlertTriangle size={80} color="#ef4444" style={{ marginBottom: '1rem' }} />

                <h1 style={{ fontSize: '3rem', margin: '0 0 1rem 0', color: '#fff', textTransform: 'uppercase' }}>
                    ¡ATENCIÓN!
                </h1>

                <h2 style={{ fontSize: '2rem', color: '#fca5a5', marginBottom: '2rem' }}>
                    {event.title}
                </h2>

                <p style={{ fontSize: '1.2rem', marginBottom: '3rem', color: '#e5e7eb' }}>
                    Este evento está próximo a vencer. Se requiere acción inmediata.
                </p>

                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexDirection: 'column' }}>
                    <button
                        onClick={() => onComplete(event)}
                        className="btn"
                        style={{
                            fontSize: '1.5rem', padding: '1rem 2rem',
                            background: '#22c55e', // Green
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                        }}
                    >
                        <CheckCircle size={28} /> COMPLETAR AHORA
                    </button>

                    <button
                        onClick={() => onSnooze(event)}
                        className="btn-secondary"
                        style={{
                            fontSize: '1.2rem', padding: '0.8rem',
                            borderColor: '#fff', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px'
                        }}
                    >
                        <Clock size={24} /> Posponer (Recordar más tarde)
                    </button>
                </div>
            </div>
        </div>
    );
}
