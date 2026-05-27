import { clearAuthCache } from '../../lib/api/client';
import { authClient } from '../../lib/auth-client';

interface AuthHeaderProps {
  userName?: string | null;
}

export default function AuthHeader({ userName }: AuthHeaderProps) {
  async function handleSignOut() {
    await authClient.signOut();
    clearAuthCache();
    window.location.href = '/';
  }

  if (userName) {
    return (
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        <span className="hidden md:inline text-sm font-semibold text-warm-700 truncate max-w-[10rem]">
          Hola, {userName.split(' ')[0]}
        </span>
        <button
          type="button"
          onClick={handleSignOut}
          className="text-sm font-bold text-warm-700 hover:text-coral-600 transition-colors rounded-lg px-3 py-2 focus-ring-warm"
        >
          Salir
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Iniciar sesión — ícono en mobile, texto en sm+ */}
      <a
        href="/login"
        className="flex items-center justify-center gap-1.5 rounded-lg text-warm-700 hover:text-lilac-600 transition-colors focus-ring-warm p-2 sm:px-3 sm:py-2"
        title="Iniciar sesión"
        aria-label="Iniciar sesión"
      >
        {/* Ícono persona */}
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
        <span className="hidden sm:inline text-sm font-bold">Iniciar sesión</span>
      </a>

      {/* Registrarse — ícono en mobile, texto en sm+ */}
      <a
        href="/login?register=1"
        className="flex items-center justify-center gap-1.5 rounded-xl bg-coral-500 text-white shadow-[0_4px_14px_-2px_rgba(224,122,95,0.45)] hover:bg-coral-600 transition-all active:scale-[0.98] focus-ring-warm p-2 sm:py-2 sm:px-4"
        title="Registrarse"
        aria-label="Registrarse"
      >
        {/* Ícono persona+ */}
        <svg className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
        </svg>
        <span className="hidden sm:inline text-sm font-bold whitespace-nowrap">Registrarse</span>
      </a>
    </div>
  );
}
