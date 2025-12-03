import { useState } from 'react';
import { User } from 'lucide-react';

export function UserLogin({ onLogin }) {
    const [name, setName] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim()) {
            onLogin(name.trim());
        }
    };

    return (
        <div className="glass-panel" style={{ maxWidth: '400px', margin: '100px auto' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem' }}>
                <div style={{ background: 'rgba(139, 92, 246, 0.2)', padding: '1rem', borderRadius: '50%' }}>
                    <User size={48} color="#8b5cf6" />
                </div>
            </div>
            <h2>Bienvenido</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                Por favor ingresa tu nombre para continuar
            </p>

            <form onSubmit={handleSubmit}>
                <input
                    type="text"
                    placeholder="Tu nombre..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                />
                <button type="submit" className="btn" style={{ width: '100%' }}>
                    Ingresar al Sistema
                </button>
            </form>
        </div>
    );
}
