import { useEffect, useState } from 'react';
import AuthModal from '@/features/auth/client/AuthModal';
import { useActiveSessions, useCompletedSessions } from '@/features/dashboard/client/hooks/useSessions';
import QueryProvider from '@/shared/client/ui/QueryProvider';

function formatDate(iso: string) {
  return new Intl.DateTimeFormat('es-PE', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
  }).format(new Date(iso));
}

interface DashboardProps {
  userName?: string | null;
}

function DashboardContent({ userName }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [historialOpen, setHistorialOpen] = useState(false);
  const [authModal, setAuthModal] = useState<'login' | 'register' | null>(null);
  const isLoggedIn = !!userName;

  const LIMIT = 10;

  // React Query hooks for fetching data
  const activeSessionsQuery = useActiveSessions();
  const completedSessionsQuery = useCompletedSessions(LIMIT);

  const activeSessions = activeSessionsQuery.data ?? [];
  const completedSessions = completedSessionsQuery.data?.pages.flatMap((page) => page.sessions) ?? [];
  const completedTotal = completedSessionsQuery.data?.pages[0]?.total ?? 0;
  const loadingMore = completedSessionsQuery.isFetchingNextPage;

  // Sync active tab based on active sessions presence on initial load
  useEffect(() => {
    if (activeSessionsQuery.isSuccess) {
      if (activeSessions.length === 0) {
        setActiveTab('completed');
      } else {
        setActiveTab('active');
      }
    }
  }, [activeSessionsQuery.isSuccess, activeSessions.length]);

  const loadMoreCompleted = () => {
    if (loadingMore || !completedSessionsQuery.hasNextPage) return;
    void completedSessionsQuery.fetchNextPage();
  };

  const totalSessionsCount = activeSessions.length + completedTotal;

  // ── NOT LOGGED IN (Single Column, Flat, No Shadows/Gradients) ──────────────────
  if (!isLoggedIn) {
    return (
      <div className="relative h-full w-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 overflow-y-auto select-none">
        {/* ── ELEMENTOS DECORATIVOS DE FONDO (z-0) ── */}

        {/* Ondas blancas de fondo superpuestas estilo Fairytales (onda pequeña, media y grande) */}
        <svg
          className="absolute bottom-0 left-0 w-full h-[35%] sm:h-[45%] pointer-events-none z-0"
          viewBox="0 0 1440 600"
          preserveAspectRatio="none"
        >
          {/* Onda Grande (Fondo, Opacidad 0.25) */}
          <path
            d="M0,500 C300,480 600,560 900,400 C1200,240 1440,100 1440,100 L1440,600 L0,600 Z"
            fill="#FFFFFF"
            opacity="0.25"
          />
          {/* Onda Media (Medio, Opacidad 0.55) */}
          <path
            d="M0,530 C400,510 800,550 1100,430 C1300,340 1440,240 1440,240 L1440,600 L0,600 Z"
            fill="#FFFFFF"
            opacity="0.55"
          />
          {/* Onda Pequeña (Frente, Sólida) */}
          <path d="M0,560 C500,550 900,580 1200,500 C1350,460 1440,380 1440,380 L1440,600 L0,600 Z" fill="#FFFFFF" />
        </svg>

        {/* Nubes perfectamente redondeadas (sin cachos) */}
        <svg
          className="absolute top-[6%] left-[5%] w-24 sm:w-32 h-auto text-white pointer-events-none z-0"
          viewBox="0 0 24 24"
          fill="#FFFFFF"
          style={{ opacity: 0.8 }}
        >
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
        </svg>

        <svg
          className="absolute top-[15%] right-[10%] w-28 sm:w-36 h-auto text-white pointer-events-none z-0"
          viewBox="0 0 24 24"
          fill="#FFFFFF"
          style={{ opacity: 0.7 }}
        >
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
        </svg>

        <svg
          className="absolute top-[40%] left-[2%] w-16 h-auto text-white pointer-events-none z-0"
          viewBox="0 0 24 24"
          fill="#FFFFFF"
          style={{ opacity: 0.4 }}
        >
          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
        </svg>

        {/* Estrellas decorativas aleatorias con puntas redondeadas (educación inicial) */}
        {/* Estrella Lila (4 puntas) - Izquierda Superior */}
        <svg
          className="absolute top-[24%] left-[20%] w-5 h-5 pointer-events-none z-0 rotate-12"
          viewBox="0 0 24 24"
          fill="#818CF8"
          stroke="#818CF8"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ opacity: 0.6 }}
        >
          <path d="M12 3L14.5 9.5L21 12L14.5 14.5L12 21L9.5 14.5L3 12L9.5 9.5Z" />
        </svg>

        {/* Estrella Coral (4 puntas) - Izquierda Media */}
        <svg
          className="absolute top-[62%] left-[10%] w-6 h-6 pointer-events-none z-0 -rotate-[15deg]"
          viewBox="0 0 24 24"
          fill="#E07A5F"
          stroke="#E07A5F"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ opacity: 0.6 }}
        >
          <path d="M12 3L14.5 9.5L21 12L14.5 14.5L12 21L9.5 14.5L3 12L9.5 9.5Z" />
        </svg>

        {/* Estrella Amarilla (5 puntas) - Izquierda Inferior */}
        <svg
          className="absolute bottom-[22%] left-[25%] w-8 h-8 pointer-events-none z-0 rotate-[30deg]"
          viewBox="0 0 24 24"
          fill="#FBBF24"
          stroke="#FBBF24"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ opacity: 0.7 }}
        >
          <path d="M12 3.5l2.7 5.5 6 1-4.3 4.2 1 6-5.4-2.8-5.4 2.8 1-6-4.3-4.2 6-1z" />
        </svg>

        {/* Estrella Lila (4 puntas) - Derecha Superior */}
        <svg
          className="absolute top-[48%] right-[25%] w-5 h-5 pointer-events-none z-0 rotate-[45deg]"
          viewBox="0 0 24 24"
          fill="#818CF8"
          stroke="#818CF8"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ opacity: 0.6 }}
        >
          <path d="M12 3L14.5 9.5L21 12L14.5 14.5L12 21L9.5 14.5L3 12L9.5 9.5Z" />
        </svg>

        {/* Estrella Coral (4 puntas) - Derecha Inferior */}
        <svg
          className="absolute bottom-[35%] right-[28%] w-6 h-6 pointer-events-none z-0 -rotate-12"
          viewBox="0 0 24 24"
          fill="#E07A5F"
          stroke="#E07A5F"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ opacity: 0.6 }}
        >
          <path d="M12 3L14.5 9.5L21 12L14.5 14.5L12 21L9.5 14.5L3 12L9.5 9.5Z" />
        </svg>

        {/* ── CONTENIDO CENTRAL (z-10) ── */}
        <div className="relative z-10 w-full max-w-xl flex flex-col gap-6 md:gap-8 items-center text-center">
          {/* Título y Subtítulo */}
          <div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-warm-900 tracking-tight leading-tight">
              Tu cuaderno de campo
            </h1>
            <p className="mt-2 text-sm sm:text-base md:text-lg text-warm-700 max-w-md mx-auto">
              Observa, registra y acompaña el desarrollo de tus alumnos día a día.
            </p>
          </div>

          <div className="w-full flex flex-col items-center gap-3">
            <a
              href="/onboarding"
              className="w-full max-w-sm flex items-center justify-center gap-2 rounded-2xl bg-coral-500 hover:bg-coral-600 px-6 py-4 text-base sm:text-lg font-bold text-white transition-colors active:scale-[0.98] focus:outline-none"
            >
              Comenzar nuevo registro
              <svg
                className="h-5 w-5 transition-transform duration-200 group-hover:translate-x-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            <p className="text-sm font-bold text-warm-700">Perfectamente alineado con el CNEB</p>
          </div>
        </div>

        {/* Auth modal */}
        {authModal && <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} />}
      </div>
    );
  }

  // ── LOGGED IN (Dashboard + Sidebar Layout) ──────────────────────────────────
  const sidebarInner = (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Tabs Header */}
      <div className="flex border-b border-slate-200 bg-slate-50 shrink-0">
        <button
          type="button"
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-3 text-sm font-bold text-center border-b-2 transition-all focus:outline-none cursor-pointer ${
            activeTab === 'active'
              ? 'border-coral-500 text-coral-600'
              : 'border-transparent text-warm-700 hover:text-warm-900 hover:bg-slate-100'
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
              : 'border-transparent text-warm-700 hover:text-warm-900 hover:bg-slate-100'
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
              <a href="/onboarding" className="mt-2 text-xs font-bold text-coral-600 hover:underline">
                ¡Comienza una nueva clase!
              </a>
            </div>
          ) : (
            <ul className="flex flex-col gap-2 px-4 py-4 flex-1">
              {activeSessions.map((session) => (
                <li key={session.id}>
                  <a
                    href="/aula"
                    className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white px-4 py-3 transition-all duration-200 hover:border-lilac-400/50"
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
        ) : completedSessions.length === 0 ? (
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
                  <div className="flex flex-col gap-1 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 transition-all duration-200 hover:border-warm-300">
                    {session.grado && session.seccion && (
                      <p className="text-xs font-bold text-warm-500 uppercase tracking-wide">
                        {session.grado} · Sección {session.seccion}
                      </p>
                    )}
                    <p className="text-sm font-bold text-warm-700 line-clamp-1">{session.titulo || session.area}</p>
                    <div className="flex items-center justify-between gap-2 mt-0.5">
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-warm-600">
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
            {completedSessionsQuery.hasNextPage && (
              <div className="px-4 pb-6 pt-2 text-center shrink-0">
                <button
                  type="button"
                  onClick={loadMoreCompleted}
                  disabled={loadingMore}
                  className="w-full rounded-xl border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 px-4 py-2 text-xs font-bold text-warm-700 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                >
                  {loadingMore ? 'Cargando...' : 'Cargar más clases'}
                </button>
              </div>
            )}
          </div>
        )}
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
            {`Hola, ${userName!.split(' ')[0]} 👋`}
          </h1>
          <p className="mt-1.5 text-sm sm:text-base md:text-lg text-warm-700">Listo para registrar tu clase de hoy.</p>
        </div>

        {/* Card coral — flex-1 siempre: llena el espacio en mobile Y desktop */}
        <a
          href="/onboarding"
          className="group flex flex-col items-center justify-center gap-4 md:gap-6 flex-1 min-h-0 w-full rounded-3xl bg-coral-500 px-6 py-6 md:px-10 md:py-10 text-white border border-coral-600 transition-all duration-200 hover:bg-coral-600 active:scale-[0.99] focus:outline-none"
          aria-label="Crear nuevo registro de campo"
        >
          {/* Ícono */}
          <div className="relative shrink-0">
            <div className="relative flex h-14 w-14 md:h-20 md:w-20 items-center justify-center rounded-2xl bg-white text-3xl md:text-4xl font-extrabold text-lilac-600 border border-slate-200 rotate-3">
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

          <span className="shrink-0 flex items-center gap-2 text-sm md:text-base font-bold bg-coral-600 rounded-2xl px-5 py-2.5 transition-colors border border-white/20">
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
            className="w-full flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-warm-700 transition-all duration-200 hover:bg-slate-50 active:scale-[0.98] focus:outline-none cursor-pointer"
            aria-expanded={historialOpen}
          >
            <span className="flex items-center gap-2">
              <span aria-hidden>📖</span>
              Mis clases anteriores
              {totalSessionsCount > 0 && (
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
            <div className="mt-2 rounded-2xl border border-slate-200 bg-white overflow-hidden max-h-[350px] flex flex-col">
              {sidebarInner}
            </div>
          )}
        </div>
      </div>

      {/* ── DIVISOR VERTICAL — solo desktop ── */}
      <div className="hidden md:block w-px bg-slate-200 shrink-0 my-6" aria-hidden />

      {/* ── PANEL LATERAL — solo desktop ── */}
      <aside className="hidden md:flex w-[300px] shrink-0 flex-col bg-white border-l border-slate-200 overflow-hidden">
        <div className="px-6 pt-6 pb-4 border-b border-slate-200 shrink-0">
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

export default function Dashboard(props: DashboardProps) {
  return (
    <QueryProvider>
      <DashboardContent {...props} />
    </QueryProvider>
  );
}
