/** Fases del flujo de escaneo (sin persistir medios) */
export type ScanPhaseId = 'capture' | 'extract' | 'catalog' | 'review' | 'classroom';

export interface ScanPhaseMeta {
  id: ScanPhaseId;
  label: string;
  description: string;
  order: number;
}

export const SCAN_PHASES: ScanPhaseMeta[] = [
  {
    id: 'capture',
    order: 1,
    label: 'Captura',
    description: 'Foto de la planificación (solo en memoria)',
  },
  {
    id: 'extract',
    order: 2,
    label: 'Lectura',
    description: 'La IA lee título, competencia y criterios',
  },
  {
    id: 'catalog',
    order: 3,
    label: 'Catálogo',
    description: 'Cruce con data/curriculo.csv',
  },
  {
    id: 'review',
    order: 4,
    label: 'Revisión',
    description: 'Confirmas o corriges campos',
  },
  {
    id: 'classroom',
    order: 5,
    label: 'Aula',
    description: 'Sesión lista para observar',
  },
];

export type ScanWorkflowPhase = 'capture' | 'processing' | 'review';

export function workflowToPhaseIndex(workflow: ScanWorkflowPhase, processingStep?: 'extract' | 'catalog'): number {
  if (workflow === 'capture') return 0;
  if (workflow === 'processing') return processingStep === 'catalog' ? 2 : 1;
  return 3; // review
}

export function phaseProgress(workflow: ScanWorkflowPhase, processingStep?: 'extract' | 'catalog'): number {
  const idx = workflowToPhaseIndex(workflow, processingStep);
  return Math.round(((idx + 1) / SCAN_PHASES.length) * 100);
}
