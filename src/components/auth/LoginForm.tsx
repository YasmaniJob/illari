import { useEffect, useState } from 'react';
import { clearAuthCache } from '../../lib/api/client';
import { authClient } from '../../lib/auth-client';

interface LoginFormProps {
  redirectTo: string;

  initialMode?: 'login' | 'register';
}

export default function LoginForm({ redirectTo, initialMode = 'login' }: LoginFormProps) {
  const [email, setEmail] = useState('');

  const [password, setPassword] = useState('');

  const [name, setName] = useState('');

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);

  const [error, setError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (new URLSearchParams(window.location.search).has('register')) {
      setMode('register');
    }
  }, []);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();

    setError(null);

    setLoading(true);

    try {
      if (mode === 'register') {
        const { error: signUpError } = await authClient.signUp.email({
          email,

          password,

          name: name || 'Docente',
        });

        if (signUpError) throw new Error(signUpError.message);
      } else {
        const { error: signInError } = await authClient.signIn.email({
          email,

          password,
        });

        if (signInError) throw new Error(signInError.message);
      }

      clearAuthCache();

      window.location.href = redirectTo;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-warm p-8 space-y-5 max-w-md w-full">
      <h1 className="text-3xl font-extrabold text-warm-900">{mode === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}</h1>
      <p className="text-base text-warm-700 leading-relaxed">
        {mode === 'login' ? (
          <>
            Entra para ver tu historial de clases y sincronizar tu listado en la nube. También puedes usar el cuaderno
            sin cuenta desde el inicio.
          </>
        ) : (
          <>
            Crea tu cuenta para guardar clases anteriores y tu listado de estudiantes. No necesitas registrarte para
            preparar una clase y entrar al aula hoy.
          </>
        )}
      </p>

      {mode === 'register' && (
        <div>
          <label className="text-label block mb-2" htmlFor="name">
            Nombre
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-warm"
            required
          />
        </div>
      )}

      <div>
        <label className="text-label block mb-2" htmlFor="email">
          Correo
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="input-warm"
          required
        />
      </div>

      <div>
        <label className="text-label block mb-2" htmlFor="password">
          Contraseña
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="input-warm"
          minLength={8}
          required
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
        className="text-base font-bold text-lilac-600 w-full"
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
      >
        {mode === 'login' ? '¿Primera vez? Crear cuenta' : 'Ya tengo cuenta'}
      </button>

      <a href="/" className="block text-center text-base font-semibold text-warm-600 hover:text-coral-600">
        Volver al inicio sin cuenta
      </a>
    </form>
  );
}
