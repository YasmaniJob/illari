import type { ReactNode } from 'react';

interface OnboardingStepCardProps {
  title: string;
  hint?: string;
  headerActions?: ReactNode;
  onBack?: () => void;
  onNext?: () => void;
  nextDisabled?: boolean;
  isLastStep?: boolean;
  children: ReactNode;
}

export default function OnboardingStepCard({
  title,
  hint,
  headerActions,
  onBack,
  onNext,
  nextDisabled = false,
  isLastStep = false,
  children,
}: OnboardingStepCardProps) {
  return (
    <article className="card-warm flex flex-1 min-h-0 w-full flex-col p-5 sm:p-7 md:p-8 shadow-[0_12px_40px_-10px_rgba(61,44,41,0.14)]">
      <header className="shrink-0 flex items-center justify-between gap-3 mb-4 sm:mb-5 pb-3 border-b border-cream-dark/60 select-none">
        {/* Título + Botón de regreso opcional */}
        <div className="flex items-center gap-3 min-w-0">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-1.5 rounded-2xl border-2 border-cream-dark bg-white px-3 py-1.5 text-xs font-black text-warm-700 hover:border-warm-300 hover:bg-cream/40 transition-all active:scale-97 cursor-pointer shadow-2xs shrink-0"
              title="Regresar al paso anterior"
            >
              <span className="text-sm select-none">👈</span>
              <span className="hidden sm:inline">Atrás</span>
            </button>
          )}

          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-warm-900 tracking-tight leading-tight">
              {title}
            </h2>
            {hint && <p className="mt-0.5 text-xs sm:text-sm font-semibold text-warm-600 leading-snug line-clamp-1">{hint}</p>}
          </div>
        </div>

        {/* Acciones del header + Botón Siguiente principal */}
        <div className="shrink-0 flex items-center gap-2 sm:gap-3">
          {headerActions}

          {onNext && (
            <button
              type="button"
              onClick={onNext}
              disabled={nextDisabled}
              className={[
                'flex items-center justify-center gap-2 rounded-2xl px-5 sm:px-7 py-2.5 sm:py-3 text-xs sm:text-sm font-black transition-all duration-200 shadow-md select-none shrink-0',
                !nextDisabled
                  ? isLastStep
                    ? 'bg-gradient-to-r from-coral-500 to-amber-500 hover:from-coral-600 hover:to-amber-600 text-white cursor-pointer active:scale-98 shadow-coral-500/20'
                    : 'bg-coral-500 hover:bg-coral-600 text-white cursor-pointer active:scale-98'
                  : 'bg-warm-100/90 text-warm-400 border border-warm-200/80 cursor-not-allowed opacity-65',
              ].join(' ')}
            >
              {isLastStep ? (
                <span>🚀 ¡Empezar clase!</span>
              ) : (
                <>
                  <span>Siguiente paso</span>
                  <span className="text-sm select-none">➔</span>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain">
        {children}
      </div>
    </article>
  );
}
