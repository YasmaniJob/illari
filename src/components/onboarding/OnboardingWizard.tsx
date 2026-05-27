import { useRef, useState } from 'react';
import { createSession, saveStudents } from '../../lib/api/client';
import { GRADOS } from '../../lib/classroom';
import type { CurriculumRow } from '../../lib/curriculum';
import type { MatchedScanResult } from '../../lib/curriculumMatch';
import { compressImageForScan } from '../../lib/scan/compressImage';
import CardStack, { type CardDirection } from './CardStack';
import OnboardingStepCard from './OnboardingStepCard';
import PlanningStep, { type PlanningValues, ScanHeaderAction } from './PlanningStep';
import StudentsRosterInput, { RosterHeaderActions } from './StudentsRosterInput';

// ─── Constantes ───────────────────────────────────────────────────────────────

const STEPS = ['Tu aula', 'Mis estudiantes', 'Planificación'] as const;

const STEP_EMOJI: Record<number, string> = { 1: '🏫', 2: '👥', 3: '📚' };

const TOTAL = STEPS.length;

/** Metadatos visuales de cada grado */
const GRADO_META: Record<string, { icon: string; activeBg: string; activeBorder: string; activeText: string }> = {
  '3 años': {
    icon: '🐣',
    activeBg: 'bg-honey-200/60',
    activeBorder: 'border-honey-400',
    activeText: 'text-warm-900',
  },
  '4 años': {
    icon: '🌱',
    activeBg: 'bg-mint-400/20',
    activeBorder: 'border-mint-400',
    activeText: 'text-warm-900',
  },
  '5 años': {
    icon: '🦋',
    activeBg: 'bg-sky-300/20',
    activeBorder: 'border-sky-300',
    activeText: 'text-warm-900',
  },
};

/** Secciones fijas + opción "Otro…" */
const SECCIONES_FIJAS = ['A', 'B', 'C', 'Única'] as const;

// ─── Util ─────────────────────────────────────────────────────────────────────

function getCapacidadFromCriterio(
  curriculum: CurriculumRow[],
  area: string,
  competencia: string,
  criterio: string,
): string {
  return (
    curriculum.find((r) => r.area === area && r.competencia === competencia && r.criterio === criterio)?.capacidad ?? ''
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  curriculum: CurriculumRow[];
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function OnboardingWizard({ curriculum }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<CardDirection>('forward');

  // Paso 1 — Aula
  const [grados, setGrados] = useState<string[]>([]);
  const [seccion, setSeccion] = useState('');
  const [seccionCustom, setSeccionCustom] = useState('');
  const [showSeccionInput, setShowSeccionInput] = useState(false);

  // Grado serializado para la DB (ej. "3 años, 4 años")
  const gradoStr = grados.join(', ');

  // Paso 2 — Mis estudiantes
  const [studentNames, setStudentNames] = useState<string[]>([]);
  const [rosterFileError, setRosterFileError] = useState<string | null>(null);

  // Paso 3 — Planificación
  const [planning, setPlanning] = useState<PlanningValues>({
    titulo: '',
    area: '',
    competencia: '',
    capacidades: [],
    criterios: [],
  });
  const scanFileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // ── Sección efectiva (fija o personalizada) ─────────────────────────────────

  const seccionEfectiva = showSeccionInput ? seccionCustom.trim() : seccion;

  function handleSeccionFija(s: string) {
    setSeccion(s);
    setShowSeccionInput(false);
    setSeccionCustom('');
  }

  function handleSeccionOtro() {
    setSeccion('');
    setShowSeccionInput(true);
  }

  // ── Validación ──────────────────────────────────────────────────────────────

  function isStep1Complete(): boolean {
    return grados.length >= 1 && seccionEfectiva.length >= 1;
  }

  function isStep2Complete(): boolean {
    return studentNames.filter((n) => n.trim().length >= 2).length >= 1;
  }

  function isStep3Complete(): boolean {
    return !!planning.titulo.trim() && !!planning.area;
  }

  function canAdvance(): boolean {
    if (step === 1) return isStep1Complete();
    if (step === 2) return isStep2Complete();
    return isStep3Complete();
  }

  function isStepComplete(s: number): boolean {
    if (s === 1) return isStep1Complete();
    if (s === 2) return isStep2Complete();
    return isStep3Complete();
  }

  // ── Resumen para pestañas ───────────────────────────────────────────────────

  function getTabSummary(s: number): string {
    if (s === 1) return `${gradoStr} · ${seccionEfectiva}`;
    if (s === 2) {
      const count = studentNames.filter((n) => n.trim().length >= 2).length;
      return `${count} niño${count !== 1 ? 's' : ''}`;
    }
    const areaShort = planning.area.split(' ').slice(0, 2).join(' ');
    const comp = planning.competencia.slice(0, 20);
    return `${areaShort} — ${comp}${planning.competencia.length > 20 ? '…' : ''}`;
  }

  // ── Navegación ──────────────────────────────────────────────────────────────

  function goTo(next: number) {
    setDirection(next > step ? 'forward' : 'back');
    setStep(next);
  }

  // ── Escaneo IA (paso 3) ─────────────────────────────────────────────────────

  async function handleScan(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setScanError(null);
    setScanDone(false);
    setScanning(true);
    try {
      const { base64, mimeType } = await compressImageForScan(file);
      const res = await fetch('/api/scan-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64, mimeType }),
      });
      const data = (await res.json()) as { matched: MatchedScanResult; error?: string };
      if (!res.ok) throw new Error(data.error ?? 'Error al escanear');
      const m = data.matched;
      setPlanning((prev) => ({
        titulo: m.titulo.value || prev.titulo,
        area: m.area.value || prev.area,
        competencia: m.competencia.value || prev.competencia,
        capacidades: [],
        criterios: m.criterio.value ? [m.criterio.value] : prev.criterios,
      }));
      setScanDone(true);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'No se pudo analizar la imagen.');
    } finally {
      setScanning(false);
      if (scanFileRef.current) scanFileRef.current.value = '';
    }
  }

  // ── Envío final ─────────────────────────────────────────────────────────────

  async function handleStartSession() {
    const names = studentNames.map((n) => n.trim()).filter((n) => n.length >= 2);
    const validos = planning.criterios.filter((c) => c.trim().length >= 2);
    const criterio = validos.join('; ');
    const primaryCriterio = validos[0] ?? '';
    try {
      await saveStudents(gradoStr, seccionEfectiva, names);
      await createSession({
        titulo: planning.titulo.trim() || undefined,
        grado: gradoStr,
        seccion: seccionEfectiva,
        area: planning.area,
        competencia: planning.competencia,
        capacidad: getCapacidadFromCriterio(curriculum, planning.area, planning.competencia, primaryCriterio),
        criterio,
      });
      window.location.href = '/aula';
    } catch {
      alert('No se pudo preparar la sesión. Intenta de nuevo.');
    }
  }

  // ── Tarjetas ────────────────────────────────────────────────────────────────

  const stackCards = [
    {
      id: 1,
      content: (
        <OnboardingStepCard title="Tu aula">
          <div className="flex flex-col flex-1 min-h-0 gap-5">
            {/* Grado — multiselección, toggle por tarjeta */}
            <div className="grid grid-cols-3 gap-4 flex-1 min-h-0 overflow-visible">
              {GRADOS.map((g) => {
                const meta = GRADO_META[g];
                const isActive = grados.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGrados((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))}
                    aria-pressed={isActive}
                    className={[
                      'relative flex flex-col items-center justify-center gap-3 rounded-2xl border-2',
                      'transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-lilac-500/20',
                      'w-full h-full',
                      isActive
                        ? `${meta.activeBg} ${meta.activeBorder} shadow-md`
                        : 'border-cream-dark bg-white hover:border-lilac-200 hover:bg-cream/60',
                    ].join(' ')}
                  >
                    {/* Check badge */}
                    {isActive && (
                      <span className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-coral-500 text-white text-[10px] font-extrabold shadow-sm">
                        ✓
                      </span>
                    )}
                    <span className="text-5xl leading-none" aria-hidden>
                      {meta.icon}
                    </span>
                    <span
                      className={`text-base font-extrabold leading-tight text-center ${isActive ? 'text-warm-900' : 'text-warm-500'}`}
                    >
                      {g}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Sección */}
            <div className="shrink-0">
              <p className="text-sm font-bold text-warm-900 mb-2.5">Sección</p>
              <div className="flex gap-2">
                {SECCIONES_FIJAS.map((s) => {
                  const isActive = !showSeccionInput && seccion === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSeccionFija(s)}
                      className={[
                        'flex-1 rounded-xl border-2 py-3 text-base font-extrabold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-lilac-500/20',
                        isActive
                          ? 'border-coral-500 bg-coral-500/10 text-coral-600 shadow-sm'
                          : 'border-cream-dark bg-white text-warm-700 hover:border-lilac-300',
                      ].join(' ')}
                    >
                      {s}
                    </button>
                  );
                })}
                {/* Botón Otro — con reset si ya hay valor personalizado */}
                <button
                  type="button"
                  onClick={
                    showSeccionInput && seccionCustom
                      ? () => {
                          setSeccionCustom('');
                          setShowSeccionInput(false);
                        }
                      : handleSeccionOtro
                  }
                  className={[
                    'flex-1 rounded-xl border-2 py-3 text-base font-extrabold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-lilac-500/20',
                    showSeccionInput
                      ? 'border-lilac-400 bg-lilac-100/60 text-lilac-700'
                      : 'border-cream-dark bg-white text-warm-500 hover:border-lilac-300',
                  ].join(' ')}
                >
                  {showSeccionInput && seccionCustom ? '✕ Limpiar' : '✨ Otro…'}
                </button>
              </div>

              {/* Input animado — transición suave con grid-rows */}
              <div
                className="grid transition-all duration-300 ease-in-out"
                style={{ gridTemplateRows: showSeccionInput ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <input
                    type="text"
                    value={seccionCustom}
                    onChange={(e) => setSeccionCustom(e.target.value)}
                    placeholder="Ej. D, G, Celeste, Pollitos…"
                    className="input-warm mt-3"
                    tabIndex={showSeccionInput ? 0 : -1}
                    maxLength={20}
                  />
                </div>
              </div>
            </div>
          </div>
        </OnboardingStepCard>
      ),
    },
    {
      id: 2,
      content: (
        <OnboardingStepCard
          title="Mis estudiantes"
          headerActions={
            <RosterHeaderActions
              fileError={rosterFileError}
              onFileError={setRosterFileError}
              onFileImport={(parsed) => {
                const existing = studentNames.filter((n) => n.trim().length >= 2);
                setStudentNames([...new Set([...existing, ...parsed])]);
                setRosterFileError(null);
              }}
            />
          }
        >
          <StudentsRosterInput names={studentNames} onChange={setStudentNames} />
        </OnboardingStepCard>
      ),
    },
    {
      id: 3,
      content: (
        <OnboardingStepCard
          title="Planificación"
          headerActions={
            <>
              {/* Input oculto para la cámara/galería */}
              <input
                ref={scanFileRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="sr-only"
                onChange={handleScan}
                aria-label="Subir imagen de planificación"
              />
              <ScanHeaderAction
                scanning={scanning}
                scanDone={scanDone}
                scanError={scanError}
                onScan={() => scanFileRef.current?.click()}
              />
            </>
          }
        >
          <PlanningStep curriculum={curriculum} values={planning} onChange={setPlanning} />
        </OnboardingStepCard>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 overflow-hidden">
      {/* ══════════════════════════════════════════
          COLUMNA IZQUIERDA — Pestañas de cuaderno
          ══════════════════════════════════════════ */}
      <nav
        aria-label="Pasos del asistente"
        className="w-[160px] shrink-0 flex flex-col justify-center gap-1.5 py-8 pl-6 pr-0"
      >
        {STEPS.map((label, index) => {
          const s = index + 1;
          const isActive = s === step;
          const isComplete = isStepComplete(s) && s < step;
          const canClick = isComplete;

          return (
            <button
              key={s}
              type="button"
              onClick={() => (canClick ? goTo(s) : undefined)}
              disabled={!canClick && !isActive}
              aria-current={isActive ? 'step' : undefined}
              title={isActive ? label : canClick ? `Volver a: ${label}` : label}
              className={[
                'relative flex flex-col items-start text-left w-full',
                'rounded-l-2xl px-3 py-2.5 transition-all duration-200',
                'border-y-2 border-l-2 border-r-0',
                isActive
                  ? 'bg-white border-cream-dark z-10 shadow-[-4px_4px_16px_-4px_rgba(61,44,41,0.10)] translate-x-[2px]'
                  : isComplete
                    ? 'bg-lilac-100/70 border-lilac-200/60 hover:bg-lilac-100 cursor-pointer'
                    : 'bg-cream/50 border-cream-dark/40 cursor-default opacity-50',
              ].join(' ')}
            >
              {/* Número + emoji */}
              <span className="flex items-center gap-1.5 w-full">
                <span
                  className={[
                    'flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold',
                    isActive
                      ? 'bg-coral-500 text-white'
                      : isComplete
                        ? 'bg-lilac-500 text-white'
                        : 'bg-cream-dark text-warm-500',
                  ].join(' ')}
                  aria-hidden
                >
                  {isComplete ? '✓' : s}
                </span>
                {isComplete && (
                  <span className="text-xs leading-none" aria-hidden>
                    {STEP_EMOJI[s]}
                  </span>
                )}
              </span>

              {/* Texto */}
              {isComplete ? (
                <span className="mt-1 text-[11px] font-bold text-lilac-700 leading-tight line-clamp-2 w-full">
                  {getTabSummary(s)}
                </span>
              ) : (
                <span
                  className={[
                    'mt-1 text-[11px] font-bold leading-tight w-full',
                    isActive ? 'text-warm-900' : 'text-warm-500',
                  ].join(' ')}
                >
                  {label}
                </span>
              )}
            </button>
          );
        })}

        {/* Barra de progreso */}
        <div className="mt-5 pl-1 pr-3">
          <div className="h-1 w-full rounded-full bg-cream-dark overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-coral-500 to-lilac-500 transition-all duration-500 ease-out"
              style={{ width: `${((step - 1) / (TOTAL - 1)) * 100}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] font-bold text-warm-500 text-center">
            {step} / {TOTAL}
          </p>
        </div>
      </nav>

      {/* ══════════════════════════════════════════
          COLUMNA DERECHA — Tarjeta del paso actual
          ══════════════════════════════════════════ */}
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden py-5 pr-6">
        {/* Tarjeta */}
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <CardStack cards={stackCards} activeStep={step} direction={direction} />
        </div>

        {/* Botones de navegación */}
        <footer className="shrink-0 flex gap-3 pt-3">
          <button
            type="button"
            onClick={() => (step > 1 ? goTo(step - 1) : undefined)}
            disabled={step === 1}
            className="btn-secondary flex-1 py-3 text-base"
          >
            Volver
          </button>
          {step < TOTAL ? (
            <button
              type="button"
              onClick={() => goTo(step + 1)}
              disabled={!canAdvance()}
              className="btn-primary flex-1 py-3 text-base"
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartSession}
              disabled={!canAdvance()}
              className="btn-primary flex-1 py-3 text-base"
            >
              🚀 ¡Empezar mi clase hoy!
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
