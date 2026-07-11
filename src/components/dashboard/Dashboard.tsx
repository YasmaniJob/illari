import { useEffect, useState } from 'react';
import { fetchSessions } from '../../lib/api/client';
import type { SessionConfig } from '../../lib/curriculum';
import AuthModal from '../auth/AuthModal';

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
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [activeSessions, setActiveSessions] = useState<SessionConfig[]>([]);
  const [completedSessions, setCompletedSessions] = useState<SessionConfig[]>([]);
  const [completedTotal, setCompletedTotal] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [historialOpen, setHistorialOpen] = useState(false);
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const isLoggedIn = !!userName;

  const LIMIT = 10;

  useEffect(() => {
    if (!isLoggedIn) return;

    // Fetch active sessions
    const fetchActive = fetchSessions({ status: 'active' })
      .then((res) => {
        setActiveSessions(res.sessions);
        return res.sessions;
      })
      .catch(() => {
        setActiveSessions([]);
        return [];
      });

    // Fetch first page of completed sessions
    const fetchCompletedFirstPage = fetchSessions({ status: 'completed', limit: LIMIT, offset: 0 })
      .then((res) => {
        setCompletedSessions(res.sessions);
        setCompletedTotal(res.total);
      })
      .catch(() => {
        setCompletedSessions([]);
        setCompletedTotal(0);
      });

    Promise.all([fetchActive, fetchCompletedFirstPage]).then(([active]) => {
      if (active.length === 0) {
        setActiveTab('completed');
      } else {
        setActiveTab('active');
      }
    });
  }, [isLoggedIn]);

  const loadMoreCompleted = () => {
    if (loadingMore || completedSessions.length >= completedTotal) return;
    setLoadingMore(true);

    const nextOffset = completedSessions.length;
    fetchSessions({ status: 'completed', limit: LIMIT, offset: nextOffset })
      .then((res) => {
        setCompletedSessions((prev) => [...prev, ...res.sessions]);
        setCompletedTotal(res.total);
      })
      .catch(() => {})
      .finally(() => {
        setLoadingMore(false);
      });
  };

  const totalSessionsCount = activeSessions.length + completedTotal;

  // ── Sidebar content (shared between desktop aside and mobile accordion) ──────
  const sidebarInner = isLoggedIn ? (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Tabs Header */}
      <div className="flex border-b border-cream-dark bg-cream-light/35 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all focus:outline-none cursor-pointer ${
            activeTab === 'active'
              ? 'border-coral-500 text-coral-600'
              : 'border-transparent text-warm-700 hover:text-warm-900 hover:bg-cream/20'
          }`}
        >
          En curso ({activeSessions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all focus:outline-none cursor-pointer ${
            activeTab === 'completed'
              ? 'border-coral-500 text-coral-600'
              : 'border-transparent text-warm-700 hover:text-warm-900 hover:bg-cream/20'
          }`}
        >
          Historial ({completedTotal})
        </button>
      </div>

      {/* Tabs Content */}
      <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
        {activeTab === 'active' ? (
          activeSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-4 py-8">
              <span className="text-4xl" aria-hidden>
                🌱
              </span>
              <p className="text-sm font-semibold text-warm-700 leading-relaxed">
                No tienes ninguna clase activa en este momento.
              </p>
              <a
                href="/onboarding"
                className="mt-2 text-xs font-bold text-coral-600 hover:underline"
              >
                ¡Comienza una nueva clase!
              </a>
            </div>
          ) : (
            <ul className="flex flex-col gap-2 px-4 py-4 flex-1">
              {activeSessions.map((session) => (
                <li key={session.id}>
                  <a
                    href="/aula"
                    className="flex flex-col gap-1 rounded-2xl border-2 border-cream-dark bg-white px-4 py-3 transition-all duration-200 hover:border-lilac-400/50 hover:shadow-sm"
                  >
                    {session.grado && session.seccion && (
                      <p className="text-xs font-bold text-coral-600 uppercase tracking-wide">
                        {session.grado} · Sección {session.seccion}
                      </p>
                    )}
                    <p className="text-sm font-bold text-warm-900 line-clamp-1">{session.titulo || session.area}</p>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-mint-400/30 text-warm-900">
                        En el aula
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
          completedSessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center px-4 py-8">
              <span className="text-4xl" aria-hidden>
                📖
              </span>
              <p className="text-sm font-semibold text-warm-700 leading-relaxed">
                Todavía no has terminado ninguna clase.
              </p>
            </div>
          ) : (
            <div className="flex flex-col flex-1">
              <ul className="flex flex-col gap-2 px-4 py-4">
                {completedSessions.map((session) => (
                  <li key={session.id}>
                    <div
                      className="flex flex-col gap-1 rounded-2xl border border-cream-dark bg-white/70 px-4 py-3 transition-all duration-200 hover:border-warm-300 hover:shadow-sm"
                    >
                      {session.grado && session.seccion && (
                        <p className="text-xs font-bold text-warm-500 uppercase tracking-wide">
                          {session.grado} · Sección {session.seccion}
                        </p>
                      )}
                      <p className="text-sm font-bold text-warm-700 line-clamp-1">{session.titulo || session.area}</p>
                      <div className="flex items-center justify-between gap-2 mt-0.5">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-cream-dark text-warm-600">
                          Terminada
                        </span>
                        <time className="text-xs text-warm-500 font-semibold shrink-0">
                          {formatDate(session.createdAt)}
                        </time>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              {completedSessions.length < completedTotal && (
                <div className="px-4 pb-6 pt-2 text-center shrink-0">
                  <button
                    type="button"
                    onClick={loadMoreCompleted}
                    disabled={loadingMore}
                    className="w-full rounded-xl border-2 border-cream-dark bg-white hover:bg-cream-light/30 disabled:opacity-50 px-4 py-2 text-xs font-bold text-warm-700 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                  >
                    {loadingMore ? 'Cargando...' : 'Cargar más clases'}
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  ) : (
    /* No logueado — cloud promo card */
    <div className="flex-1 overflow-y-auto px-4 py-4">
      <div className="rounded-3xl bg-white border border-cream-dark p-6 text-center shadow-sm">
        <span className="text-4xl" aria-hidden>
          ☁️
        </span>
        <p className="mt-4 text-sm text-warm-700 leading-relaxed">
          <span className="font-bold text-warm-900">Guarda tu historial en la nube.</span> Crea una cuenta gratis para
          recuperar tus clases desde cualquier dispositivo.
        </p>
        <div className="flex flex-col gap-3 mt-6">
          <button
            type="button"
            onClick={() => setAuthModal('register')}
            className="w-full rounded-xl bg-lilac-600 px-4 py-3 text-sm font-bold text-white text-center shadow-[0_4px_14px_0_rgba(139,92,246,0.35)] transition-all duration-200 hover:bg-lilac-500 active:scale-[0.98] cursor-pointer"
          >
            Crear cuenta gratis
          </button>
          <button
            type="button"
            onClick={() => setAuthModal('login')}
            className="w-full rounded-xl border-2 border-cream-dark bg-white px-4 py-3 text-sm font-bold text-warm-700 text-center transition-all duration-200 hover:bg-cream active:scale-[0.98] cursor-pointer"
          >
            Ya tengo cuenta
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden">
      {/* ── ÁREA PRINCIPAL ── */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 gap-4 md:gap-5 overflow-hidden">
        {/* Título */}
        <div className="shrink-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-warm-900 tracking-tight leading-tight">
            {isLoggedIn ? `Hola, ${userName!.split(' ')[0]} 👋` : 'Tu cuaderno de campo'}
          </h1>
          <p className="mt-1.5 text-sm sm:text-base md:text-lg text-warm-700">
            {isLoggedIn
              ? 'Listo para registrar tu clase de hoy.'
              : 'Observa, registra y acompaña mejor a tus niños cada día.'}
          </p>
        </div>

        {/* Card coral — flex-1 siempre: llena el espacio en mobile Y desktop */}
        <a
          href="/onboarding"
          className="group flex flex-col items-center justify-center gap-4 md:gap-6 flex-1 min-h-0 w-full rounded-3xl bg-gradient-to-br from-coral-500 to-coral-600 px-6 py-6 md:px-10 md:py-10 text-white shadow-[0_8px_32px_-4px_rgba(224,122,95,0.45)] transition-all duration-200 hover:shadow-[0_16px_48px_-4px_rgba(224,122,95,0.55)] hover:scale-[1.005] active:scale-[0.99] focus:outline-none"
          aria-label="Crear nuevo registro de campo"
        >
          {/* Ícono */}
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-lilac-500 rounded-full blur-xl opacity-40" aria-hidden />
            <div className="relative flex h-14 w-14 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-cream text-3xl md:text-4xl font-extrabold text-lilac-600 shadow-lg rotate-3">
              +
            </div>
          </div>

          <div className="text-center shrink-0">
            <span className="block text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold tracking-tight leading-snug">
              Crear nuevo registro de campo
            </span>
            <span className="block mt-2 text-sm md:text-base font-semibold text-white/80">
              Paso a paso: aula, currículo y propósito
            </span>
          </div>

          <span className="shrink-0 flex items-center gap-2 text-sm md:text-base font-bold bg-white/20 rounded-2xl px-5 py-2.5 group-hover:bg-white/30 transition-colors backdrop-blur-sm border border-white/20">
            Comenzar ahora
            <svg
              className="h-4 w-4 md:h-5 md:w-5 transition-transform duration-200 group-hover:translate-x-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </span>
        </a>

        {/* ── Historial colapsable — solo mobile ── */}
        <div className="md:hidden shrink-0">
          <button
            type="button"
            onClick={() => setHistorialOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 rounded-2xl border-2 border-cream-dark bg-white px-4 py-3 text-sm font-bold text-warm-700 transition-all duration-200 hover:bg-cream active:scale-[0.98] focus:outline-none cursor-pointer"
            aria-expanded={historialOpen}
          >
            <span className="flex items-center gap-2">
              <span aria-hidden>📖</span>
              Mis clases anteriores
              {isLoggedIn && totalSessionsCount > 0 && (
                <span className="rounded-full bg-coral-500/15 px-2 py-0.5 text-xs font-extrabold text-coral-600">
                  {totalSessionsCount}
                </span>
              )}
            </span>
            <svg
              className={`h-4 w-4 shrink-0 transition-transform duration-200 ${historialOpen ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {historialOpen && (
            <div className="mt-2 rounded-2xl border-2 border-cream-dark bg-[#fdf8f4] overflow-hidden max-h-[350px] flex flex-col">
              {sidebarInner}
            </div>
          )}
        </div>
      </div>

      {/* ── DIVISOR VERTICAL — solo desktop ── */}
      <div className="hidden md:block w-px bg-cream-dark shrink-0 my-6" aria-hidden />

      {/* ── PANEL LATERAL — solo desktop ── */}
      <aside className="hidden md:flex w-[300px] shrink-0 flex-col bg-[#fdf8f4] overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-cream-dark shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden>
              📖
            </span>
            <h2 className="text-base font-extrabold text-warm-900">Mis clases anteriores</h2>
          </div>
        </div>
        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">{sidebarInner}</div>
      </aside>

      {/* Auth modal */}
      {authModal && <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} />}
    </div>
  );
}
