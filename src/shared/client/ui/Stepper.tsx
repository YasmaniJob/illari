interface StepperProps {
  steps: string[];
  currentStep: number;
}

const SHORT_LABELS: Record<string, string> = {
  'Grado y sección': 'Grado',
};

export default function Stepper({ steps, currentStep }: StepperProps) {
  return (
    <nav aria-label="Pasos de configuración" className="w-full overflow-x-auto pb-1 -mx-1 px-1">
      <ol className="flex items-center gap-1 sm:gap-2 min-w-max sm:min-w-0 sm:justify-between">
        {steps.map((label, index) => {
          const stepNum = index + 1;
          const isComplete = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          const short = SHORT_LABELS[label] ?? label;

          return (
            <li key={label} className="flex items-center shrink-0 sm:flex-1 sm:shrink sm:last:flex-none">
              <div className="flex flex-col items-center gap-1.5 min-w-[3.25rem] sm:min-w-0 sm:flex-1">
                <span
                  className={[
                    'flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-xl text-base font-extrabold transition-all duration-300',
                    isComplete
                      ? 'bg-lilac-600 text-white shadow-[0_4px_12px_-2px_rgba(139,92,246,0.4)]'
                      : isCurrent
                        ? 'border-[3px] border-coral-500 bg-white text-coral-600 scale-105 shadow-[0_4px_12px_-2px_rgba(224,122,95,0.25)]'
                        : 'border-2 border-cream-dark bg-white text-warm-500',
                  ].join(' ')}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  {isComplete ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    stepNum
                  )}
                </span>
                <span
                  className={[
                    'text-xs sm:text-sm font-bold text-center leading-tight max-w-[4.5rem] sm:max-w-none',
                    isCurrent ? 'text-coral-600' : isComplete ? 'text-warm-900' : 'text-warm-500',
                  ].join(' ')}
                >
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">{label}</span>
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={[
                    'mx-1 h-1 w-4 sm:w-auto sm:flex-1 sm:min-w-[8px] sm:max-w-[28px] rounded-full transition-colors duration-300',
                    isComplete ? 'bg-lilac-400' : 'bg-cream-dark',
                  ].join(' ')}
                  aria-hidden
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
