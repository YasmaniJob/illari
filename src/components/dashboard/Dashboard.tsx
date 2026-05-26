import { useEffect, useState } from 'react';
import { fetchSessions } from '../../lib/api/client';
import type { SessionConfig } from '../../lib/curriculum';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

interface DashboardProps {
  userName?: string | null;
}

export default function Dashboard({ userName }: DashboardProps) {
  const [sessions, setSessions] = useState<SessionConfig[]>([]);
  const isLoggedIn = !!userName;

  useEffect(() => {
    if (!isLoggedIn) return;
    fetchSessions()
      .then(setSessions)
      .catch(() => setSessions([]));
  }, [isLoggedIn]);

  return (
    <div className="h-full flex overflow-hidden">
      {/* ── ÁREA PRINCIPAL (70%) ── */}
      <div className="flex-1 flex flex-col items-center justify-center px-10 py-8 gap-8">
        {/* Saludo contextual */}
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-warm-900 tracking-tight leading-tight">
            {isLoggedIn ? `Hola, ${userName!.split(' ')[0]} 👋` : 'Tu cuaderno de campo'}
          </h1>
          <p className="mt-2 text-lg text-warm-700">
            {isLoggedIn
              ? 'Listo para registrar tu clase de hoy.'
              : 'Observa, registra y acompaña mejor a tus niños cada día.'}
          </p>
        </div>

        {/* Botón de acción principal */}
        <a
          href="/onboarding"
          className="group flex flex-col items-center gap-4 w-full max-w-sm rounded-3xl bg-gradient-to-br from-coral-500 to-coral-600 px-10 py-8 text-white shadow-[0_8px_32px_-4px_rgba(224,122,95,0.5)] transition-all duration-200 hover:shadow-[0_12px_40px_-4px_rgba(224,122,95,0.6)] hover:scale-[1.02] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-coral-500/30"
          aria-label="Crear nuevo registro de campo"
        >
          <span className="text-5xl" aria-hidden>
            ➕
          </span>
          <span className="text-2xl font-extrabold tracking-tight text-center leading-snug">
            Crear nuevo registro de campo
          </span>
          <span className="text-base font-semibold text-white/80 text-center">
            Paso a paso: aula, currículo y propósito
          </span>
          <span className="mt-1 flex items-center gap-2 text-base font-bold bg-white/20 rounded-2xl px-5 py-2 group-hover:bg-white/30 transition-colors">
            Comenzar ahora
            <svg
              className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </a>
      </div>

      {/* ── DIVISOR VERTICAL ── */}
      <div className="w-px bg-cream-dark shrink-0 my-6" aria-hidden />

      {/* ── PANEL LATERAL DE HISTORIAL (30%) ── */}
      <aside className="w-[320px] shrink-0 flex flex-col bg-[#fdf8f4] overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-cream-dark">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              📖
            </span>
            <h2 className="text-base font-extrabold text-warm-900">Mis clases anteriores</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {isLoggedIn ? (
            sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-center px-4">
                <span className="text-4xl" aria-hidden>
                  🌱
                </span>
                <p className="text-sm font-semibold text-warm-700 leading-relaxed">
                  Todavía no guardaste ninguna clase. ¡La primera será especial!
                </p>
              </div>
            ) : (
              <ul className="flex flex-col gap-2">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <a
                      href={session.status === 'active' ? '/aula' : '#'}
                      className="flex flex-col gap-1 rounded-2xl border-2 border-cream-dark bg-white px-4 py-3 transition-all duration-200 hover:border-lilac-400/50 hover:shadow-sm"
                    >
                      {session.grado && session.seccion && (
                        <p className="text-xs font-bold text-coral-600 uppercase tracking-wide">
                          {session.grado} · Sección {session.seccion}
                        </p>
                      )}
                      <p className="text-sm font-bold text-warm-900 line-clamp-1">{session.titulo || session.area}</p>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span
                          className={[
                            'text-xs font-bold px-2 py-0.5 rounded-full',
                            session.status === 'active'
                              ? 'bg-mint-400/30 text-warm-900'
                              : 'bg-cream-dark text-warm-700',
                          ].join(' ')}
                        >
                          {session.status === 'active' ? 'En el aula' : 'Terminada'}
                        </span>
                        <time className="text-xs text-warm-500 font-semibold shrink-0">
                          {formatDate(session.createdAt)}
                        </time>
                      </div>
                    </a>
                  </li>
                ))}
              </ul>
            )
          ) : (
            /* Usuario no logueado: invitación discreta */
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-4">
              <span className="text-4xl" aria-hidden>
                ☁️
              </span>
              <p className="text-sm text-warm-700 leading-relaxed">
                <span className="font-bold text-warm-900">Guarda tu historial en la nube.</span> Crea una cuenta gratis
                para recuperar tus clases desde cualquier dispositivo.
              </p>
              <div className="flex flex-col gap-2 w-full">
                <a
                  href="/login?register=1"
                  className="w-full rounded-2xl bg-lilac-600 px-4 py-2.5 text-sm font-bold text-white text-center shadow-sm transition-all duration-200 hover:bg-lilac-500 active:scale-[0.98]"
                >
                  Crear cuenta gratis
                </a>
                <a
                  href="/login"
                  className="w-full rounded-2xl border-2 border-cream-dark bg-white px-4 py-2.5 text-sm font-bold text-warm-700 text-center transition-all duration-200 hover:bg-cream active:scale-[0.98]"
                >
                  Ya tengo cuenta
                </a>
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
