import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CurriculumRow } from '../../lib/curriculum';
import { getAreas, getCapacidades, getCompetencias } from '../../lib/curriculum';
import CustomSelect from '../ui/CustomSelect';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface PlanningValues {
  titulo: string;
  area: string;
  competencia: string;
  /** Capacidades seleccionadas (subconjunto de las disponibles) */
  capacidades: string[];
  /** Criterios escritos libremente por el docente */
  criterios: string[];
  evidencia: string;
}

interface PlanningStepProps {
  curriculum: CurriculumRow[];
  /** Edad/grado seleccionado en el paso 1 — filtra áreas, competencias y capacidades */
  edad?: string;
  values: PlanningValues;
  onChange: (values: PlanningValues) => void;
}

// ─── Util ─────────────────────────────────────────────────────────────────────

function patch(prev: PlanningValues, partial: Partial<PlanningValues>): PlanningValues {
  return { ...prev, ...partial };
}

// ─── Header action: botón de escaneo IA ──────────────────────────────────────

interface ScanHeaderActionProps {
  scanning: boolean;
  scanDone: boolean;
  scanError: string | null;
  onScan: () => void;
}

export function ScanHeaderAction({ scanning, scanDone, scanError, onScan }: ScanHeaderActionProps) {
  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onScan}
        disabled={scanning}
        title="Escanear planificación impresa con IA"
        className={[
          'flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-bold transition-all duration-200 focus:outline-none',
          scanDone
            ? 'border-mint-400/60 bg-mint-400/10 text-warm-900'
            : 'border-lilac-200 bg-lilac-50/60 hover:bg-lilac-100/60 hover:border-lilac-400/60 text-warm-900',
          scanning ? 'opacity-70 cursor-wait' : 'cursor-pointer active:scale-[0.97]',
        ].join(' ')}
      >
        {scanning ? (
          <span
            className="h-3 w-3 rounded-full border-2 border-lilac-500 border-t-transparent animate-spin block"
            aria-hidden
          />
        ) : (
          <span aria-hidden>{scanDone ? '✅' : '📷'}</span>
        )}
        {scanning ? 'Leyendo…' : scanDone ? 'Completado' : 'Escanear'}
      </button>
      {scanError && <span className="text-[10px] font-semibold text-coral-600">⚠ {scanError}</span>}
    </div>
  );
}

// ─── Tag input para criterios (escritura libre) ───────────────────────────────

interface CriteriosTagInputProps {
  criterios: string[];
  onChange: (criterios: string[]) => void;
}

function CriteriosTagInput({ criterios, onChange }: CriteriosTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const validCriterios = criterios.filter((c) => c.trim().length >= 2);

  function addCriterio(text: string) {
    const trimmed = text.trim();
    if (trimmed.length < 2) return;
    if (!criterios.includes(trimmed)) {
      onChange([...criterios.filter((c) => c.trim().length >= 2), trimmed]);
    }
    setInputValue('');
  }

  function removeAt(index: number) {
    onChange(validCriterios.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCriterio(inputValue);
    }
    if (e.key === 'Backspace' && inputValue === '' && validCriterios.length > 0) {
      onChange(validCriterios.slice(0, -1));
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData('text');
    const lines = text
      .split(/[\n\r,;]+/)
      .map((s) => s.trim())
      .filter((s) => s.length >= 2);
    if (lines.length > 1) {
      e.preventDefault();
      const merged = [...new Set([...validCriterios, ...lines])];
      onChange(merged);
      setInputValue('');
    }
  }

  return (
    <div
      className="rounded-2xl border-2 border-cream-dark bg-white px-3 py-3 flex flex-col gap-2 cursor-text transition-all duration-200"
      onClick={() => inputRef.current?.focus()}
    >
      {validCriterios.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {validCriterios.map((c, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-xl bg-coral-500/10 border border-coral-500/30 pl-3 pr-1.5 py-1 text-xs font-semibold text-coral-700"
            >
              {c}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeAt(i);
                }}
                aria-label={`Quitar criterio: ${c}`}
                className="flex h-4 w-4 items-center justify-center rounded-full text-coral-400 hover:bg-coral-500/20 hover:text-coral-700 transition-colors font-bold text-xs"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onPaste={handlePaste}
        placeholder={validCriterios.length === 0 ? 'Escribe un criterio y pulsa Enter…' : 'Añadir otro criterio…'}
        className="w-full bg-transparent text-sm text-warm-900 placeholder:text-warm-400 outline-none"
        autoComplete="off"
      />
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function PlanningStep({ curriculum, edad, values, onChange }: PlanningStepProps) {
  const isCuna = edad === '1 año' || edad === '2 años';

  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [errorSuggestions, setErrorSuggestions] = useState<string | null>(null);

  async function handleSuggest() {
    setLoadingSuggestions(true);
    setErrorSuggestions(null);
    try {
      const res = await fetch('/api/suggest-criteria', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          area: values.area,
          competencia: values.competencia,
          capacidades: values.capacidades,
          evidencia: values.evidencia,
          edad: edad,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Error al sugerir');
      setSuggestions(data.suggestions ?? []);
    } catch (err) {
      setErrorSuggestions(err instanceof Error ? err.message : 'Error al conectar con la IA');
    } finally {
      setLoadingSuggestions(false);
    }
  }

  useEffect(() => {
    if (isCuna) {
      if (values.titulo !== 'Planificación de contexto') {
        onChange(patch(values, { titulo: 'Planificación de contexto' }));
      }
    } else if (values.titulo === 'Planificación de contexto') {
      onChange(patch(values, { titulo: '' }));
    }
  }, [isCuna, values.titulo, onChange, values]);

  // Cascada curricular — filtrada por edad si se provee
  const areas = useMemo(() => getAreas(curriculum, edad), [curriculum, edad]);

  const competencias = useMemo(
    () => (values.area ? getCompetencias(curriculum, values.area, edad) : []),
    [curriculum, values.area, edad],
  );

  const todasCapacidades = useMemo(
    () => (values.area && values.competencia ? getCapacidades(curriculum, values.area, values.competencia, edad) : []),
    [curriculum, values.area, values.competencia, edad],
  );

  // ── Cascada ─────────────────────────────────────────────────────────────────

  function handleAreaChange(area: string) {
    setSuggestions([]);
    setErrorSuggestions(null);
    onChange(patch(values, { area, competencia: '', capacidades: [], criterios: [], evidencia: '' }));
  }

  function handleCompetenciaChange(competencia: string) {
    setSuggestions([]);
    setErrorSuggestions(null);
    const capacities = competencia
      ? getCapacidades(curriculum, values.area, competencia, edad)
      : [];
    onChange(patch(values, { competencia, capacidades: capacities, criterios: [], evidencia: '' }));
  }

  // ── Toggle capacidad ────────────────────────────────────────────────────────

  const toggleCapacidad = useCallback(
    (cap: string) => {
      const next = values.capacidades.includes(cap)
        ? values.capacidades.filter((c) => c !== cap)
        : [...values.capacidades, cap];
      onChange(patch(values, { capacidades: next }));
    },
    [values, onChange],
  );

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    // Sin overflow-hidden ni overflow-y-auto aquí — el scroll lo maneja OnboardingStepCard
    <div className="flex flex-col gap-4">
      {/* Título */}
      {!isCuna && (
        <div>
          <label htmlFor="plan-titulo" className="text-sm font-bold text-warm-900 mb-1.5 block">
            Título de la sesión
          </label>
          <input
            id="plan-titulo"
            type="text"
            value={values.titulo}
            onChange={(e) => onChange(patch(values, { titulo: e.target.value }))}
            placeholder="Ej.: Jugamos con los números en el patio"
            className="input-warm"
          />
        </div>
      )}

      {/* Área + Competencia: columna en mobile, fila en desktop */}
      <div className="flex flex-col sm:flex-row gap-3 items-start">
        <div className="w-full sm:w-[40%] sm:shrink-0">
          <CustomSelect
            label="Área"
            value={values.area}
            options={areas}
            placeholder="Elegir…"
            onChange={handleAreaChange}
          />
        </div>
        <div className="w-full sm:flex-1 sm:min-w-0">
          <CustomSelect
            label="Competencia"
            value={values.competencia}
            options={competencias}
            placeholder={values.area ? 'Elegir…' : 'Primero elige área'}
            disabled={!values.area}
            onChange={handleCompetenciaChange}
          />
        </div>
      </div>

      {/* Capacidades — seleccionables */}
      {values.competencia && todasCapacidades.length > 0 && (
        <div>
          <p className="text-[10px] font-extrabold text-warm-600 uppercase tracking-wide mb-2">
            Capacidades{' '}
            <span className="normal-case font-semibold text-warm-500">— selecciona las que trabajarás hoy</span>
          </p>
          <div className="flex flex-col gap-1.5">
            {todasCapacidades.map((cap) => {
              const selected = values.capacidades.includes(cap);
              return (
                <button
                  key={cap}
                  type="button"
                  onClick={() => toggleCapacidad(cap)}
                  aria-pressed={selected}
                  className={[
                    'w-full flex items-start gap-2.5 rounded-xl border-2 px-4 py-3 text-left transition-all duration-150',
                    'focus:outline-none',
                    selected
                      ? 'border-mint-400 bg-mint-400/15 text-warm-900'
                      : 'border-cream-dark bg-white text-warm-600 hover:border-lilac-200 hover:bg-cream/60',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[9px] font-extrabold transition-colors',
                      selected ? 'bg-mint-400 text-white' : 'bg-cream-dark text-warm-500',
                    ].join(' ')}
                    aria-hidden
                  >
                    {selected ? '✔' : '○'}
                  </span>
                  <span className="text-xs font-semibold leading-snug">{cap}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Evidencia — escritura libre */}
      {values.competencia && (
        <div>
          <label htmlFor="plan-evidencia" className="text-sm font-bold text-warm-900 mb-1.5 block">
            Evidencia de aprendizaje
          </label>
          <input
            id="plan-evidencia"
            type="text"
            value={values.evidencia}
            onChange={(e) => onChange(patch(values, { evidencia: e.target.value }))}
            placeholder="Ej.: Dibujo de su familia explicando su significado, registro fotográfico de su juego, etc."
            className="input-warm"
          />
        </div>
      )}

      {/* Criterios — escritura libre con tag input */}
      {values.competencia && (
        <div>
          <p className="text-sm font-bold text-warm-900 mb-1.5">Criterios de evaluación</p>
          <p className="text-xs text-warm-500 font-semibold mb-2">
            Escribe los criterios de tu sesión y pulsa{' '}
            <kbd className="rounded bg-cream-dark px-1 font-mono text-[10px]">Enter</kbd> para confirmar cada uno
          </p>

          {/* Botón de sugerencia IA */}
          <div className="mb-3.5 mt-2 flex justify-start">
            <button
              type="button"
              onClick={handleSuggest}
              disabled={loadingSuggestions}
              className="inline-flex items-center gap-1.5 rounded-xl border border-lilac-200 bg-lilac-50/60 px-3.5 py-2 text-xs font-bold text-warm-900 hover:bg-lilac-100/60 hover:border-lilac-400/60 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-wait"
            >
              {loadingSuggestions ? (
                <span className="h-3 w-3 rounded-full border-2 border-lilac-500 border-t-transparent animate-spin block" />
              ) : (
                <span>✨</span>
              )}
              {loadingSuggestions ? 'Generando sugerencias…' : 'Sugerir criterios con IA'}
            </button>
          </div>

          {errorSuggestions && (
            <p className="text-xs text-coral-600 font-semibold mb-2">⚠ {errorSuggestions}</p>
          )}

          {suggestions.length > 0 && (
            <div className="rounded-2xl border-2 border-dashed border-lilac-200 bg-lilac-50/20 p-4 mb-3.5">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-lilac-600 mb-2.5">
                Sugerencias de la IA (Haz clic para agregar)
              </p>
              <div className="flex flex-col gap-2">
                {suggestions.map((sug, i) => {
                  const alreadyAdded = values.criterios.includes(sug);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        if (!alreadyAdded) {
                          onChange(patch(values, { criterios: [...values.criterios, sug] }));
                        }
                      }}
                      disabled={alreadyAdded}
                      className={[
                        'text-xs font-semibold leading-relaxed text-left px-3.5 py-2.5 rounded-xl border transition-all duration-200 focus:outline-none w-full',
                        alreadyAdded
                          ? 'bg-cream/40 border-cream-dark text-warm-400 cursor-not-allowed'
                          : 'bg-white border-lilac-100 text-warm-800 hover:bg-lilac-50/40 hover:border-lilac-300 active:scale-[0.99]',
                      ].join(' ')}
                    >
                      {alreadyAdded ? '✓ ' : '+ '}
                      {sug}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <CriteriosTagInput
            criterios={values.criterios}
            onChange={(criterios) => onChange(patch(values, { criterios }))}
          />
        </div>
      )}
    </div>
  );
}
