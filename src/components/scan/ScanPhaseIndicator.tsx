import {
  SCAN_PHASES,
  phaseProgress,
  type ScanWorkflowPhase,
} from '../../lib/scan/phases';

interface ScanPhaseIndicatorProps {
  workflow: ScanWorkflowPhase;
  processingStep?: 'extract' | 'catalog';
}

export default function ScanPhaseIndicator({
  workflow,
  processingStep,
}: ScanPhaseIndicatorProps) {
  const activeIndex =
    workflow === 'capture'
      ? 0
      : workflow === 'processing'
        ? processingStep === 'catalog'
          ? 2
          : 1
        : 3;

  const progress = phaseProgress(workflow, processingStep);

  return (
    <div className="shrink-0 mb-4">
      <div className="flex items-center justify-between gap-2 mb-2">
        <span className="text-sm font-bold text-warm-700">
          Fase {activeIndex + 1} de {SCAN_PHASES.length}
        </span>
        <span className="text-sm font-bold text-coral-600">{progress}%</span>
      </div>
      <div className="h-2 w-full rounded-full bg-cream-dark overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-coral-500 to-lilac-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-2 text-base font-extrabold text-warm-900">
        {SCAN_PHASES[activeIndex]?.label}
      </p>
      <p className="text-sm text-warm-600">{SCAN_PHASES[activeIndex]?.description}</p>
    </div>
  );
}
