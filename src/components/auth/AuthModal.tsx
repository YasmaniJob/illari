import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { clearAuthCache } from '../../lib/api/client';
import { authClient } from '../../lib/auth-client';

interface AuthModalProps {
  initialMode?: 'login' | 'register';
  onClose: () => void;
}

export default function AuthModal({ initialMode = 'login', onClose }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Bloquea scroll del body
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Cierra con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'register') {
        const { error: err } = await authClient.signUp.email({
          email,
          password,
          name: name || 'Docente',
        });
        if (err) throw new Error(err.message);
      } else {
        const { error: err } = await authClient.signIn.email({ email, password });
        if (err) throw new Error(err.message);
      }
      clearAuthCache();
      // Recarga la página actual — el docente no pierde su contexto de navegación
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  const modal = (
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" onClick={onClose} aria-hidden />

      {/* Sheet — sube desde abajo en mobile, centrado en desktop */}
      <div
        className="relative w-full sm:max-w-md bg-white sm:rounded-3xl rounded-t-3xl shadow-2xl overflow-hidden"
        style={{ animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1) both' }}
      >
        {/* Handle mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden">
          <div className="h-1 w-10 rounded-full bg-warm-500/20" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-4 sm:pt-6 pb-2">
          <h2 className="text-2xl font-extrabold text-warm-900">
            {mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-xl text-warm-400 hover:bg-cream hover:text-warm-700 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <p className="px-6 pb-4 text-sm text-warm-600 leading-relaxed">
          {mode === 'login'
            ? 'Entra para ver tu historial y sincronizar tu listado en la nube.'
            : 'Crea tu cuenta para guardar clases y tu listado de estudiantes.'}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 pb-6 space-y-4">
          {mode === 'register' && (
            <div>
              <label className="text-sm font-bold text-warm-900 block mb-1.5" htmlFor="modal-name">
                Nombre
              </label>
              <input
                id="modal-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-warm"
                required
                autoComplete="name"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-bold text-warm-900 block mb-1.5" htmlFor="modal-email">
              Correo
            </label>
            <input
              id="modal-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-warm"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-warm-900 block mb-1.5" htmlFor="modal-password">
              Contraseña
            </label>
            <input
              id="modal-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-warm"
              minLength={8}
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && (
            <p className="text-sm font-semibold text-coral-600" role="alert">
              {error}
            </p>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full py-3.5">
            {loading ? 'Espera…' : mode === 'login' ? 'Entrar' : 'Registrarme'}
          </button>

          <button
            type="button"
            className="text-sm font-bold text-lilac-600 w-full py-1 hover:text-lilac-700 transition-colors"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
          >
            {mode === 'login' ? '¿Primera vez? Crear cuenta' : 'Ya tengo cuenta'}
          </button>
        </form>

        {/* Safe area */}
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)' }} />
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(modal, document.body) : null;
}
