import { useState } from 'react';
import { X, Calendar, Clock, Repeat } from 'lucide-react';

export function EventForm({ onClose, onSave }) {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        dueDate: '',
        dueTime: '',
        recurrence: 'none' // none, daily, weekly, monthly
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            id: Date.now().toString(),
            status: 'pending',
            createdAt: new Date().toISOString()
        });
    };

    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
        }}>
            <div className="glass-panel" style={{ width: '90%', maxWidth: '500px', textAlign: 'left', background: '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                    <h2 style={{ margin: 0, color: 'var(--accent-primary)' }}>Nuevo Evento</h2>
                    <button onClick={onClose} className="btn-secondary" style={{ border: 'none', padding: '4px' }}>
                        <X />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <label>Título del Asunto</label>
                    <input
                        required
                        value={formData.title}
                        onChange={e => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Ej: Pago de Impuestos"
                    />

                    <label>Descripción (Opcional)</label>
                    <textarea
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Detalles adicionales..."
                        rows={3}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label><Calendar size={14} /> Fecha</label>
                            <input
                                type="date"
                                required
                                value={formData.dueDate}
                                onChange={e => setFormData({ ...formData, dueDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label><Clock size={14} /> Hora</label>
                            <input
                                type="time"
                                value={formData.dueTime}
                                onChange={e => setFormData({ ...formData, dueTime: e.target.value })}
                            />
                        </div>
                        <div>
                            <label><Repeat size={14} /> Recurrencia</label>
                            <select
                                value={formData.recurrence}
                                onChange={e => setFormData({ ...formData, recurrence: e.target.value })}
                            >
                                <option value="none">Una vez</option>
                                <option value="daily">Diario</option>
                                <option value="weekly">Semanal</option>
                                <option value="monthly">Mensual</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} className="btn-secondary">Cancelar</button>
                        <button type="submit" className="btn">Guardar Evento</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
