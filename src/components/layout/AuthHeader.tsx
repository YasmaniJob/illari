import { authClient } from '../../lib/auth-client';
import { clearAuthCache } from '../../lib/api/client';

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
      <a
        href="/login"
        className="text-sm font-bold text-warm-700 hover:text-lilac-600 transition-colors rounded-lg px-3 py-2 focus-ring-warm"
      >
        Iniciar sesión
      </a>
      <a href="/login?register=1" className="btn-primary !py-2 !px-4 text-sm whitespace-nowrap">
        Registrarse
      </a>
    </div>
  );
}
