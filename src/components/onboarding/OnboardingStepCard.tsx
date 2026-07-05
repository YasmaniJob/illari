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
    <article className="card-warm flex flex-1 min-h-0 w-full flex-col p-5 sm:p-6 shadow-[0_8px_32px_-8px_rgba(61,44,41,0.18)] md:rounded-l-none">
      <header className="shrink-0 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl sm:text-2xl font-extrabold text-warm-900 leading-tight">{title}</h2>
          {hint && <p className="mt-1 text-sm text-warm-600 leading-snug line-clamp-2">{hint}</p>}
        </div>
        {headerActions && <div className="shrink-0 flex items-center gap-2">{headerActions}</div>}
      </header>
      <div className="mt-4 flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain">{children}</div>
    </article>
  );
}
