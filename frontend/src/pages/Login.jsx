// src/pages/Login.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirigir si ya está logueado
  useEffect(() => {
    if (user) {
      navigate('/pos', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Completá todos los campos');
      return;
    }

    setLoading(true);
    try {
      const userData = await login(email, password);
      toast.success(`¡Bienvenido, ${userData.name}!`);
      navigate('/pos');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Decoración de fondo */}
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,160,69,0.15) 0%, transparent 70%)',
        top: -100,
        right: -100
      }} />
      <div style={{
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(232,160,69,0.1) 0%, transparent 70%)',
        bottom: -50,
        left: -50
      }} />

      <div className="login-card" style={{ position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div className="login-logo">
          <div className="coffee-icon">
            <img src={'/images/delicias.png'}
                            style={{ width: 44, height: 44, objectFit: 'cover' }}
                            onError={e => { e.target.src = 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=60'; }}
                          />
          </div>
          <h1 style={{ 
            color: 'var(--espresso)', 
            fontFamily: 'var(--font-display)', 
            fontSize: 24, 
            marginTop: 8 
          }}>
            Delicias Rodantes
          </h1>
          <p style={{ 
            color: 'var(--text-muted)', 
            fontSize: 13, 
            marginTop: 4 
          }}>
            Café al paso & cosas ricas
          </p>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: 16 
        }}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              className="form-control"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            style={{ marginTop: 8 }}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner" /> Ingresando...
              </>
            ) : (
              'Ingresar'
            )}
          </button>
        </form>

        {/* Credenciales de prueba */}
{/*         <div style={{
          marginTop: 24,
          padding: '12px 16px',
          background: 'var(--foam)',
          borderRadius: 'var(--radius)',
          fontSize: 12,
          color: 'var(--text-muted)'
        }}>
          <strong style={{ color: 'var(--text-secondary)' }}>
            Sistema de ventas:
          </strong>
          <div style={{ marginTop: 6, lineHeight: 1.6 }}>
            👑 Admin: <code style={{ 
              background: 'white', 
              padding: '2px 6px', 
              borderRadius: 4,
              fontFamily: 'monospace'
            }}>usuario@mail.com</code> / <code style={{ 
              background: 'white', 
              padding: '2px 6px', 
              borderRadius: 4,
              fontFamily: 'monospace'
            }}>password</code>
            <br />
            🧑‍💼 Cajero: <code style={{ 
              background: 'white', 
              padding: '2px 6px', 
              borderRadius: 4,
              fontFamily: 'monospace'
            }}>usuario@mail.com</code> / <code style={{ 
              background: 'white', 
              padding: '2px 6px', 
              borderRadius: 4,
              fontFamily: 'monospace'
            }}>password</code>
          </div>
        </div> */}

        {/* Footer */}
        <div style={{ 
          textAlign: 'center', 
          marginTop: 20, 
          fontSize: 12, 
          color: 'var(--text-muted)' 
        }}>
          Powered by <strong>Jorge Pastoriza</strong>
        </div>
      </div>
    </div>
  );
}
