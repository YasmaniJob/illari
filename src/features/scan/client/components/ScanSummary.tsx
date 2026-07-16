import type { CurriculumRow } from '@/features/curriculum/curriculum';
import type { MatchedScanResult } from '@/features/curriculum/curriculumMatch';
import CurricularFieldsEditor, {
  type CurricularValues,
} from '@/features/scan/client/components/CurricularFieldsEditor';
import { validateCurricularRow } from '@/features/scan/client/lib/catalog';
import { GRADOS, SECCIONES } from '@/shared/client/classroom';
import SelectionCards from '@/shared/client/ui/SelectionCards';

interface ScanSummaryProps {
  curriculum: CurriculumRow[];
  matched: MatchedScanResult;
  curricular: CurricularValues;
  titulo: string;
  grado: string;
  seccion: string;
  onTituloChange: (v: string) => void;
  onGradoChange: (v: string) => void;
  onSeccionChange: (v: string) => void;
  onCurricularChange: (v: CurricularValues) => void;
  onRescan: () => void;
  onStart: () => void;
  canStart: boolean;
}

function ConfidenceBadge({ value }: { value: number }) {
  if (value <= 0) return null;
  const level = value >= 0.75 ? 'Alta' : value >= 0.5 ? 'Media' : 'Revisar';
  const colors =
    value >= 0.75
      ? 'bg-mint-400/25 text-warm-900'
      : value >= 0.5
        ? 'bg-honey-200/80 text-warm-900'
        : 'bg-coral-500/15 text-coral-600';
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colors}`}>
      {level} · {Math.round(value * 100)}%
    </span>
  );
}

export default function ScanSummary({
  curriculum,
  matched,
  curricular,
  titulo,
  grado,
  seccion,
  onTituloChange,
  onGradoChange,
  onSeccionChange,
  onCurricularChange,
  onRescan,
  onStart,
  canStart,
}: ScanSummaryProps) {
  const catalogValid = validateCurricularRow(
    curricular.area,
    curricular.competencia,
    curricular.capacidad,
    curricular.criterio,
    curriculum,
  );

  return (
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      <header className="shrink-0 mb-3">
        <p className="text-lg font-bold text-coral-600">Fase 4 — Revisión</p>
        <h2 className="text-2xl font-extrabold text-warm-900 mt-0.5">Resumen capturado</h2>
        <p className="text-sm text-warm-700 mt-1">Sin foto guardada. Ajusta lo necesario y pasa al aula.</p>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="scan-titulo" className="text-label">
              Escenario de aprendizaje
            </label>
            <ConfidenceBadge value={matched.titulo.confidence} />
          </div>
          <input
            id="scan-titulo"
            type="text"
            value={titulo}
            onChange={(e) => onTituloChange(e.target.value)}
            className="input-warm"
          />
        </div>

        <SelectionCards label="Grado" value={grado} options={GRADOS} onChange={onGradoChange} columns={3} />
        <SelectionCards label="Sección" value={seccion} options={SECCIONES} onChange={onSeccionChange} columns={4} />

        {!catalogValid && (
          <p className="text-sm font-semibold text-coral-600 rounded-lg bg-coral-500/10 px-3 py-2">
            Completa el currículo: la combinación debe existir en el catálogo.
          </p>
        )}

        <CurricularFieldsEditor curriculum={curriculum} values={curricular} onChange={onCurricularChange} />
      </div>

      <footer className="shrink-0 flex flex-col sm:flex-row gap-3 pt-3 border-t-2 border-cream-dark">
        <button type="button" onClick={onRescan} className="btn-secondary flex-1 py-3.5 text-base">
          Fase 1 · Reescanear
        </button>
        <button type="button" onClick={onStart} disabled={!canStart} className="btn-primary flex-1 py-3.5 text-base">
          Fase 5 · Empezar sesión
        </button>
      </footer>
    </div>
  );
}
