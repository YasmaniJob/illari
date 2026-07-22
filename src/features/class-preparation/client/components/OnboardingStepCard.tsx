import type { ReactNode } from 'react';

interface OnboardingStepCardProps {
  title: string;
  hint?: string;
  /** Acciones opcionales que se renderizan a la derecha del título */
  headerActions?: ReactNode;
  children: ReactNode;
}

export default function OnboardingStepCard({ title, hint, headerActions, children }: OnboardingStepCardProps) {
  return (
    <article className="card-warm flex flex-1 min-h-0 w-full flex-col p-6 sm:p-7 md:p-8 shadow-[0_12px_40px_-10px_rgba(61,44,41,0.14)]">
      <header className="shrink-0 flex items-center justify-between gap-4 mb-5">
        <div className="min-w-0">
          <h2 className="text-2xl sm:text-3xl font-black text-warm-900 tracking-tight leading-tight">{title}</h2>
          {hint && <p className="mt-1 text-sm font-semibold text-warm-600 leading-snug line-clamp-2">{hint}</p>}
        </div>
        {headerActions && <div className="shrink-0 flex items-center gap-2">{headerActions}</div>}
      </header>
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overflow-x-hidden overscroll-contain">
        {children}
      </div>
    </article>
  );
}

