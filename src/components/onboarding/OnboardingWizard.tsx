import { AnimatePresence, motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
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

const CICLO_I_ITEMS = [
  { key: '1 año',  emoji: '🍼', bg: '#fce7f3', border: '#f9a8d4', label: '#be185d' },
  { key: '2 años', emoji: '🌱', bg: '#d1fae5', border: '#6ee7b7', label: '#065f46' },
] as const;

const CICLO_II_ITEMS = [
  { key: '3 años', emoji: '🌻', bg: '#fef3c7', border: '#fcd34d', label: '#92400e' },
  { key: '4 años', emoji: '🦋', bg: '#ede9fe', border: '#c4b5fd', label: '#5b21b6' },
  { key: '5 años', emoji: '⭐', bg: '#ffedd5', border: '#fdba74', label: '#9a3412' },
] as const;

const SECCIONES_FIJAS = ['A', 'B', 'C', 'D', 'Única'] as const;

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

// ─── GradoCard — con tilt 3D (Framer Motion) ────────────────────────────────

interface GradoCardProps {
  gradoKey: string;
  emoji: string;
  bg: string;
  border: string;
  label: string;
  isSelected: boolean;
  onToggle: (key: string) => void;
}

function GradoCard({ gradoKey, emoji, bg, border, label, isSelected, onToggle }: GradoCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const rawX = useMotionValue(0.5);
  const rawY = useMotionValue(0.5);
  const springX = useSpring(rawX, { stiffness: 200, damping: 20 });
  const springY = useSpring(rawY, { stiffness: 200, damping: 20 });
  const rotateY = useTransform(springX, [0, 1], [-10, 10]);
  const rotateX = useTransform(springY, [0, 1], [8, -8]);
  const shineX = useTransform(springX, [0, 1], ['-40%', '140%']);
  const shineY = useTransform(springY, [0, 1], ['-40%', '140%']);

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    rawX.set((e.clientX - rect.left) / rect.width);
    rawY.set((e.clientY - rect.top) / rect.height);
  }

  function handleMouseLeave() {
    rawX.set(0.5);
    rawY.set(0.5);
  }

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ perspective: '600px' }}
      className="h-full"
    >
      <motion.button
        type="button"
        onClick={() => onToggle(gradoKey)}
        aria-pressed={isSelected}
        whileTap={{ scale: 0.94, rotateX: 0, rotateY: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className="relative w-full h-full rounded-2xl overflow-hidden select-none flex flex-col items-center justify-center gap-2 focus:outline-none"
        style={
          {
            rotateX,
            rotateY,
            transformStyle: 'preserve-3d',
            backgroundColor: bg,
            borderWidth: '2px',
            borderStyle: 'solid',
            borderColor: isSelected ? border : 'transparent',
            outline: 'none',
          } as React.CSSProperties
        }
      >
        {/* Shine */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl"
          style={{
            background: `radial-gradient(circle at ${shineX} ${shineY}, rgba(255,255,255,0.5) 0%, transparent 65%)`,
          }}
        />

        {/* Tick */}
        <motion.span
          className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-extrabold"
          style={{ backgroundColor: border, color: '#fff' }}
          initial={false}
          animate={isSelected ? { scale: [0, 1.4, 1], opacity: 1 } : { scale: 0.6, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 20 }}
        >
          ✓
        </motion.span>

        {/* Emoji */}
        <motion.span
          className="leading-none select-none"
          style={{ fontSize: '2rem', transformStyle: 'preserve-3d' }}
          initial={false}
          animate={isSelected ? { scale: [1, 1.35, 1], translateZ: 20 } : { scale: 1, translateZ: 0 }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
        >
          {emoji}
        </motion.span>

        {/* Label */}
        <span className="text-xs font-extrabold tracking-tight text-center leading-tight" style={{ color: label }}>
          {gradoKey}
        </span>
      </motion.button>
    </div>
  );
}

// ─── Vista de Grados ──────────────────────────────────────────────────────────

interface GradosViewProps {
  grados: string[];
  onToggle: (key: string) => void;
}

function GradosView({ grados, onToggle }: Omit<GradosViewProps, 'onNext'>) {
  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0 pb-1 pr-1">
      {/* Ciclo I */}
      <div className="flex flex-col flex-1 min-h-0">
        <p className="text-[10px] font-extrabold text-warm-400 uppercase tracking-widest mb-2 shrink-0">
          Ciclo I — Cuna · 0 a 2 años
        </p>
        <div className="grid grid-cols-2 gap-2.5 flex-1 min-h-0">
          {CICLO_I_ITEMS.map((item) => (
            <GradoCard
              key={item.key}
              gradoKey={item.key}
              emoji={item.emoji}
              bg={item.bg}
              border={item.border}
              label={item.label}
              isSelected={grados.includes(item.key)}
              onToggle={onToggle}
            />
          ))}
        </div>
      </div>

      {/* Ciclo II */}
      <div className="flex flex-col flex-1 min-h-0">
        <p className="text-[10px] font-extrabold text-warm-400 uppercase tracking-widest mb-2 shrink-0">
          Ciclo II — Jardín · 3 a 5 años
        </p>
        <div className="grid grid-cols-3 gap-2.5 flex-1 min-h-0">
          {CICLO_II_ITEMS.map((item) => (
            <GradoCard
              key={item.key}
              gradoKey={item.key}
              emoji={item.emoji}
              bg={item.bg}
              border={item.border}
              label={item.label}
              isSelected={grados.includes(item.key)}
              onToggle={onToggle}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Vista de Sección ─────────────────────────────────────────────────────────

interface SeccionViewProps {
  grados: string[];
  seccion: string;
  onChange: (s: string) => void;
  onBack: () => void;
}

function SeccionView({ grados, seccion, onChange, onBack }: SeccionViewProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState('');

  function handleFija(s: string) {
    setShowCustom(false);
    setCustom('');
    onChange(s);
  }

  function handleCustomChange(val: string) {
    setCustom(val);
    onChange(val.trim());
  }

  const allItems = [...CICLO_I_ITEMS, ...CICLO_II_ITEMS];

  return (
    <div className="flex flex-col gap-4 flex-1 min-h-0">
      {/* Chips de grados seleccionados */}
      <div className="flex flex-wrap gap-2 shrink-0">
        {grados.map((g) => {
          const found = allItems.find((i) => i.key === g);
          return (
            <span
              key={g}
              className="inline-flex items-center gap-1.5 rounded-xl border-2 px-3 py-1.5 text-xs font-extrabold"
              style={{ backgroundColor: found?.bg, borderColor: found?.border, color: found?.label }}
            >
              <span>{found?.emoji}</span> {g}
            </span>
          );
        })}
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-xl border-2 border-dashed border-warm-300 px-3 py-1.5 text-xs font-bold text-warm-500 hover:border-warm-400 hover:text-warm-700 transition-colors"
        >
          ✏️ Editar
        </button>
      </div>

      {/* Pregunta */}
      <div className="shrink-0">
        <p className="text-lg font-extrabold text-warm-900 mb-0.5">¿En qué sección?</p>
        <p className="text-sm text-warm-500">
          {grados.length > 1
            ? 'Todos los grados comparten la misma sección (unidocencia).'
            : 'Selecciona la sección de tu aula.'}
        </p>
      </div>

      {/* Botones de sección — llenan el espacio restante */}
      <div className="flex-1 min-h-0 relative">
        <AnimatePresence mode="wait">
          {/* ── Vista: grid de secciones ── */}
          {!showCustom && (
            <motion.div
              key="grid"
              className="absolute inset-0 grid grid-cols-3 gap-2.5"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
            >
              {SECCIONES_FIJAS.map((s) => {
                const active = seccion === s;
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleFija(s)}
                    className={[
                      'h-full w-full rounded-2xl border-2 text-lg font-extrabold transition-all duration-150 focus:outline-none',
                      active
                        ? 'bg-lilac-500 border-lilac-500 text-white'
                        : 'bg-white border-cream-dark text-warm-700 hover:border-lilac-300 hover:bg-lilac-50',
                    ].join(' ')}
                  >
                    {s}
                  </button>
                );
              })}

              {/* Otra */}
              <button
                type="button"
                onClick={() => setShowCustom(true)}
                className="h-full w-full rounded-2xl border-2 border-cream-dark bg-white text-lg font-extrabold text-coral-500 hover:border-coral-300 hover:bg-coral-50 transition-all duration-150 focus:outline-none"
              >
                Otra…
              </button>
            </motion.div>
          )}

          {/* ── Vista: input centrado ── */}
          {showCustom && (
            <motion.div
              key="custom"
              className="absolute inset-0 flex flex-col items-center justify-center gap-4"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <p className="text-sm font-bold text-warm-500">Escribe el nombre de tu sección</p>

              <input
                type="text"
                value={custom}
                onChange={(e) => handleCustomChange(e.target.value)}
                placeholder="Ej. Celeste, Pollitos, D…"
                maxLength={20}
                autoFocus
                className="w-full max-w-xs text-center text-2xl font-extrabold text-warm-900 placeholder:text-warm-300 bg-transparent border-b-2 border-lilac-300 pb-2 focus:outline-none transition-colors duration-200"
              />

              <button
                type="button"
                onClick={() => {
                  setShowCustom(false);
                  setCustom('');
                  onChange('');
                }}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-warm-400 hover:text-lilac-600 transition-colors mt-2 px-3 py-1.5 rounded-xl hover:bg-lilac-50"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
                Volver a las secciones
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface OnboardingWizardProps {
  curriculum: CurriculumRow[];
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function OnboardingWizard({ curriculum }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<CardDirection>('forward');

  // Paso 1 — grados seleccionados + una sola sección compartida (unidocencia)
  const [grados, setGrados] = useState<string[]>([]);
  const [seccion, setSeccion] = useState('');
  const [subpaso, setSubpaso] = useState<'grados' | 'seccion'>('grados');

  // String para la DB: "3 años, 4 años (A)"
  const gradoStr = grados.length > 0 ? `${grados.join(', ')}${seccion ? ` (${seccion})` : ''}` : '';

  function toggleGrado(key: string) {
    setGrados((prev) => {
      const isCicloI = ['1 año', '2 años'].includes(key);
      if (prev.includes(key)) {
        return prev.filter((g) => g !== key);
      }
      
      if (isCicloI) {
        // Clear Ciclo II grades when choosing a Ciclo I grade
        return [...prev.filter((g) => !['3 años', '4 años', '5 años'].includes(g)), key];
      } else {
        // Clear Ciclo I grades when choosing a Ciclo II grade
        return [...prev.filter((g) => !['1 año', '2 años'].includes(g)), key];
      }
    });
  }

  function confirmarGrados() {
    setSubpaso('seccion');
  }

  function volverAGrados() {
    setSubpaso('grados');
    setSeccion('');
  }

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
    evidencia: '',
  });
  const scanFileRef = useRef<HTMLInputElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  // ── Validación ──────────────────────────────────────────────────────────────

  function isStep1Complete(): boolean {
    return grados.length >= 1 && seccion.trim().length >= 1;
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
    if (s === 1) return gradoStr || '—';
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
        evidencia: prev.evidencia,
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
      await saveStudents(gradoStr, seccion, names);
      await createSession({
        titulo: planning.titulo.trim() || undefined,
        grado: gradoStr,
        seccion: seccion,
        area: planning.area,
        competencia: planning.competencia,
        capacidad: getCapacidadFromCriterio(curriculum, planning.area, planning.competencia, primaryCriterio),
        criterio,
        evidencia: planning.evidencia.trim(),
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
          {subpaso === 'grados' ? (
            <GradosView grados={grados} onToggle={toggleGrado} />
          ) : (
            <SeccionView grados={grados} seccion={seccion} onChange={setSeccion} onBack={volverAGrados} />
          )}
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
          title={grados.some((g) => ['1 año', '2 años'].includes(g)) ? 'Planificación de contexto' : 'Planificación'}
          headerActions={
            <>
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
          <PlanningStep curriculum={curriculum} edad={grados[0]} values={planning} onChange={setPlanning} />
        </OnboardingStepCard>
      ),
    },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full min-h-0 overflow-hidden flex-col md:flex-row">
      {/* MOBILE — Stepper */}
      <div className="md:hidden shrink-0 px-6 pt-5 flex flex-col gap-2">
        <div className="flex justify-between items-center text-sm font-semibold">
          <span className="text-[#f97316] bg-orange-100 px-3 py-1 rounded-full flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-[#f97316] text-white flex items-center justify-center text-xs">
              {step}
            </span>
            {STEPS[step - 1]}
          </span>
          <span className="text-gray-400 font-bold">
            {step} / {TOTAL}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-1.5">
          <div
            className="bg-[#f97316] h-1.5 rounded-full transition-all duration-500 ease-out"
            style={{ width: `${(step / TOTAL) * 100}%` }}
          />
        </div>
      </div>

      {/* DESKTOP — Pestañas */}
      <nav
        aria-label="Pasos del asistente"
        className="hidden md:flex md:w-[160px] shrink-0 md:flex-col md:justify-center gap-1.5 md:py-8 md:pl-6 md:pr-0"
      >
        {STEPS.map((label, index) => {
          const s = index + 1;
          const isActive = s === step;
          const isComplete = isStepComplete(s) && s < step;
          return (
            <button
              key={s}
              type="button"
              onClick={() => (isComplete ? goTo(s) : undefined)}
              disabled={!isComplete && !isActive}
              aria-current={isActive ? 'step' : undefined}
              className={[
                'relative flex flex-col items-start text-left rounded-l-2xl px-3 py-2.5 transition-all duration-200 border-y-2 border-l-2 border-r-0',
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
                >
                  {isComplete ? '✓' : s}
                </span>
                {isComplete && <span className="text-xs leading-none">{STEP_EMOJI[s]}</span>}
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

      {/* COLUMNA DERECHA */}
      <div className="flex flex-1 min-h-0 flex-col overflow-hidden px-4 pb-0 md:py-5 md:pr-6 md:pl-0">
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <CardStack cards={stackCards} activeStep={step} direction={direction} />
        </div>

        <footer className="shrink-0 pt-3 pb-4 md:pb-0 bg-white md:bg-transparent border-t border-cream-dark md:border-none">
          <div className="flex items-center gap-3">
            {/* ── Botón Atrás ── */}
            <button
              type="button"
              onClick={() => {
                if (step > 1) goTo(step - 1);
                else if (subpaso === 'seccion') volverAGrados();
                else window.location.href = '/';
              }}
              className={[
                'flex items-center justify-center gap-1.5 shrink-0 rounded-2xl border-2 border-cream-dark bg-white px-5 py-3.5 text-sm font-bold text-warm-600 hover:border-warm-300 hover:text-warm-800 transition-all focus:outline-none focus-ring-warm',
                step === 1 && subpaso === 'grados' ? 'hidden md:flex' : 'flex',
              ].join(' ')}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              {step === 1 && subpaso === 'grados' ? 'Inicio' : 'Atrás'}
            </button>

            {/* ── Botón acción principal ── */}
            {step === 1 && subpaso === 'grados' && (
              <button
                type="button"
                onClick={confirmarGrados}
                disabled={grados.length === 0}
                className="btn-primary flex-1 py-3.5 text-base"
              >
                Elegir sección →
              </button>
            )}
            {step === 1 && subpaso === 'seccion' && (
              <button
                type="button"
                onClick={() => goTo(2)}
                disabled={!canAdvance()}
                className="btn-primary flex-1 py-3.5 text-base"
              >
                Mis estudiantes →
              </button>
            )}
            {step === 2 && (
              <button
                type="button"
                onClick={() => goTo(3)}
                disabled={!canAdvance()}
                className="btn-primary flex-1 py-3.5 text-base"
              >
                Planificación →
              </button>
            )}
            {step === 3 && (
              <button
                type="button"
                onClick={handleStartSession}
                disabled={!canAdvance()}
                className="btn-primary flex-1 py-3.5 text-base"
              >
                🚀 ¡Empezar clase!
              </button>
            )}
          </div>
        </footer>
      </div>
    </div>
  );
}
