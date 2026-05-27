import { useRef, useState } from 'react';
import { createSession, saveStudents } from '../../lib/api/client';
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
            {/* Grado — Selección única con radio cards */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {[
                { key: '3 años', emoji: '🐣', className: '' },
                { key: '4 años', emoji: '🌱', className: '' },
                { key: '5 años', emoji: '🦋', className: 'col-span-2' },
              ].map((item) => {
                const isActive = grados.includes(item.key);
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setGrados([item.key])}
                    aria-pressed={isActive}
                    className={[
                      'rounded-2xl border-2 p-6 flex flex-col items-center justify-center gap-4 transition-all hover:shadow-md h-40 active:scale-[0.98] cursor-pointer focus:outline-none focus:ring-4 focus:ring-[#f97316]/20',
                      item.className,
                      isActive
                        ? 'border-[#f97316] bg-[#fff7ed]'
                        : 'border-[#fde6d5] bg-white text-[#4a3f35]',
                    ].join(' ')}
                  >
                    <div className="text-5xl leading-none">{item.emoji}</div>
                    <span className="font-bold text-lg text-[#4a3f35]">{item.key}</span>
                  </button>
                );
              })}
            </div>

            {/* Sección */}
            <div className="shrink-0">
              <p className="text-base font-bold text-[#4a3f35] mb-4">Sección</p>
              <div className="flex flex-wrap gap-3">
                {SECCIONES_FIJAS.map((s) => {
                  const isActive = !showSeccionInput && seccion === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSeccionFija(s)}
                      className={[
                        'rounded-xl border-2 py-3 px-4 text-center font-bold transition-all hover:bg-gray-50 flex-1 min-w-[70px] cursor-pointer active:scale-[0.98] focus:outline-none focus:ring-4 focus:ring-[#f97316]/20',
                        isActive
                          ? 'border-[#f97316] bg-[#fff7ed] text-[#f97316]'
                          : 'border-[#fde6d5] bg-white text-[#4a3f35]',
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
                    'rounded-xl border-2 py-3 px-4 text-center font-bold transition-all hover:bg-gray-50 flex-1 min-w-[70px] cursor-pointer active:scale-[0.98] flex items-center justify-center gap-2 focus:outline-none focus:ring-4 focus:ring-[#f97316]/20',
                    showSeccionInput
                      ? 'border-[#f97316] bg-[#fff7ed] text-[#f97316]'
                      : 'border-[#fde6d5] bg-white text-[#f97316]',
                  ].join(' ')}
                >
                  {showSeccionInput && seccionCustom ? '✕ Limpiar' : '✨ Otro...'}
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
                    className="w-full rounded-2xl border-2 border-[#fde6d5] bg-white px-5 py-4 text-lg text-[#4a3f35] placeholder:text-[#8b7355]/70 shadow-[0_2px_8px_-2px_rgba(61,44,41,0.06)] transition-all duration-200 ease-in-out focus:outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/20 mt-3"
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
    <div className="flex h-full min-h-0 overflow-hidden flex-col md:flex-row">

      {/* ══════════════════════════════════════════
          MOBILE — Stepper indicator (solo < md)
          ══════════════════════════════════════════ */}
      <div className="md:hidden shrink-0 px-6 pt-6 flex flex-col gap-2">
        <div className="flex justify-between items-center text-sm font-semibold">
          <span className="text-[#f97316] bg-orange-100 px-3 py-1 rounded-full flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#f97316] text-white flex items-center justify-center text-xs">
              {step}
            </span>
            {STEPS[step - 1]}
          </span>
          <span className="text-gray-400 font-bold">{step} / {TOTAL}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
          <div
            className="bg-[#f97316] h-1.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(step / TOTAL) * 100}%` }}
          />
        </div>
      </div>

      {/* ══════════════════════════════════════════
          DESKTOP — Pestañas de cuaderno (solo ≥ md)
          ══════════════════════════════════════════ */}
      <nav
        aria-label="Pasos del asistente"
        className="hidden md:flex md:w-[160px] shrink-0 md:flex-col md:justify-center gap-1.5 md:py-8 md:pl-6 md:pr-0"
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
                'relative flex flex-col items-start text-left',
                'rounded-l-2xl px-3 py-2.5 transition-all duration-200',
                'border-y-2 border-l-2 border-r-0',
                isActive
                  ? 'bg-white border-cream-dark z-10 shadow-[-4px_4px_16px_-4px_rgba(61,44,41,0.10)] translate-x-[2px]'
                  : isComplete
                    ? 'bg-lilac-100/70 border-lilac-200/60 hover:bg-lilac-100 cursor-pointer'
                    : 'bg-cream/50 border-cream-dark/40 cursor-default opacity-50',
              ].join(' ')}
            >
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

        {/* Barra de progreso desktop */}
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
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden px-4 pb-0 md:py-5 md:pr-6 md:pl-0">
        {/* Tarjeta — scrollable en mobile */}
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <CardStack cards={stackCards} activeStep={step} direction={direction} />
        </div>

        {/* Botones de navegación — apilados en mobile, fila en desktop */}
        <footer className="shrink-0 flex flex-col-reverse md:flex-row gap-2 md:gap-3 pt-3 pb-4 md:pb-0 bg-white md:bg-transparent border-t border-cream-dark md:border-none">
          {/* Paso 1 en mobile: oculto. Desktop: siempre visible. En paso 1 navega al inicio. */}
          <button
            type="button"
            onClick={() => step > 1 ? goTo(step - 1) : (window.location.href = '/')}
            className={['btn-secondary w-full md:flex-1 py-3 text-base', step === 1 ? 'hidden md:inline-flex' : ''].join(' ')}
          >
            Volver
          </button>
          {step < TOTAL ? (
            <button
              type="button"
              onClick={() => goTo(step + 1)}
              disabled={!canAdvance()}
              className="btn-primary w-full md:flex-1 py-3 text-base"
            >
              Siguiente →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleStartSession}
              disabled={!canAdvance()}
              className="btn-primary w-full md:flex-1 py-3 text-base"
            >
              🚀 ¡Empezar mi clase hoy!
            </button>
          )}
        </footer>
      </div>
    </div>
  );
}
