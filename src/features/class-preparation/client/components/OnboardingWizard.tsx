import { AnimatePresence, motion } from 'framer-motion';
import { Fragment, useEffect, useRef, useState } from 'react';
import CardStack, { type CardDirection } from '@/features/class-preparation/client/components/CardStack';
import OnboardingStepCard from '@/features/class-preparation/client/components/OnboardingStepCard';
import PlanningStep, {
  type PlanningValues,
  ScanHeaderAction,
} from '@/features/class-preparation/client/components/PlanningStep';
import StudentsRosterInput, {
  RosterHeaderActions,
} from '@/features/class-preparation/client/components/StudentsRosterInput';
import { type CurriculumRow, getCapacidades } from '@/features/curriculum/curriculum';
import type { MatchedScanResult } from '@/features/curriculum/curriculumMatch';
import { compressImageForScan } from '@/features/scan/client/lib/compressImage';
import { createSession, fetchStudents, saveStudents } from '@/shared/client/api-client';

// ─── Constantes ───────────────────────────────────────────────────────────────

const STEPS = ['Tu aula', 'Mis estudiantes', 'Planificación'] as const;
const STEP_EMOJI: Record<number, string> = { 1: '🏫', 2: '👥', 3: '📚' };

const CICLO_I_ITEMS = [
  { key: '1 año', emoji: '🍼', bg: '#fce7f3', border: '#f9a8d4', label: '#be185d' },
  { key: '2 años', emoji: '🌱', bg: '#d1fae5', border: '#6ee7b7', label: '#065f46' },
] as const;

const CICLO_II_ITEMS = [
  { key: '3 años', emoji: '🌻', bg: '#fef3c7', border: '#fcd34d', label: '#92400e' },
  { key: '4 años', emoji: '🦋', bg: '#ede9fe', border: '#c4b5fd', label: '#5b21b6' },
  { key: '5 años', emoji: '⭐', bg: '#ffedd5', border: '#fdba74', label: '#9a3412' },
] as const;

const SECCIONES_FIJAS = ['A', 'B', 'C', 'D', 'Única'] as const;

// ─── Util ─────────────────────────────────────────────────────────────────────

// ─── GradoCard ────────────────────────────────────────────────────────────────

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
  return (
    <motion.button
      type="button"
      onClick={() => onToggle(gradoKey)}
      aria-pressed={isSelected}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      className="relative w-full h-full min-h-[110px] py-4 px-3 rounded-2xl overflow-hidden select-none flex flex-col items-center justify-center gap-2.5 focus:outline-none transition-all duration-200 cursor-pointer"
      style={
        {
          backgroundColor: isSelected ? bg : bg + '75',
          borderWidth: '2px',
          borderStyle: 'solid',
          borderColor: isSelected ? border : 'rgba(0,0,0,0.06)',
          boxShadow: isSelected
            ? '0 10px 18px -4px rgba(0, 0, 0, 0.06)'
            : '0 2px 4px rgba(0, 0, 0, 0.02)',
          outline: 'none',
        } as React.CSSProperties
      }
    >
      {/* Tick */}
      <motion.span
        className="absolute top-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full text-xs font-extrabold shadow-2xs"
        style={{ backgroundColor: border, color: '#fff' }}
        initial={false}
        animate={isSelected ? { scale: [0, 1.3, 1], opacity: 1 } : { scale: 0.6, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
      >
        ✓
      </motion.span>

      {/* Emoji wrapped in a clean badge shape */}
      <motion.div
        className="w-13 h-13 rounded-2xl flex items-center justify-center bg-white shadow-xs border border-cream-dark/50 shrink-0"
        initial={false}
        animate={isSelected ? { scale: [1, 1.1, 1] } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      >
        <span className="text-2xl select-none leading-none">{emoji}</span>
      </motion.div>

      {/* Label */}
      <span
        className="text-sm font-extrabold tracking-tight text-center leading-tight transition-colors duration-200"
        style={{ color: isSelected ? label : '#5c4a42' }}
      >
        {gradoKey}
      </span>
    </motion.button>
  );
}

// ─── Vista del Paso 1: Grado + Sección ────────────────────────────────────────

interface AulaStepViewProps {
  grados: string[];
  onToggleGrado: (key: string) => void;
  seccion: string;
  onChangeSeccion: (val: string) => void;
}

function AulaStepView({ grados, onToggleGrado, seccion, onChangeSeccion }: AulaStepViewProps) {
  const [showCustom, setShowCustom] = useState(false);
  const [custom, setCustom] = useState('');

  function handleFija(s: string) {
    setShowCustom(false);
    setCustom('');
    onChangeSeccion(s);
  }

  function handleCustomChange(val: string) {
    setCustom(val);
    onChangeSeccion(val.trim());
  }

  const hasGrados = grados.length > 0;

  return (
    <div className="flex flex-col md:flex-row gap-6 md:gap-8 flex-1 min-h-0 p-1">
      {/* Columna Izquierda: Selección de Edades / Grados */}
      <div className="flex flex-col gap-5 flex-1 min-h-0">
        {/* Ciclo I */}
        <div className="flex flex-col gap-3 flex-1 min-h-0">
          <div className="flex items-center shrink-0 select-none">
            <span className="inline-flex items-center gap-1.5 bg-rose-50 border border-rose-200/80 rounded-full px-3.5 py-1 text-xs font-black uppercase tracking-wider text-rose-700 shadow-2xs">
              <span>👶</span>
              <span>Ciclo I — Cuna · 0 a 2 años</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3.5 flex-1">
            {CICLO_I_ITEMS.map((item) => (
              <GradoCard
                key={item.key}
                gradoKey={item.key}
                emoji={item.emoji}
                bg={item.bg}
                border={item.border}
                label={item.label}
                isSelected={grados.includes(item.key)}
                onToggle={onToggleGrado}
              />
            ))}
          </div>
        </div>

        {/* Ciclo II */}
        <div className="flex flex-col gap-3 flex-1 min-h-0 mt-1">
          <div className="flex items-center shrink-0 select-none">
            <span className="inline-flex items-center gap-1.5 bg-purple-50 border border-purple-200/80 rounded-full px-3.5 py-1 text-xs font-black uppercase tracking-wider text-purple-700 shadow-2xs">
              <span>🧸</span>
              <span>Ciclo II — Jardín · 3 a 5 años</span>
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3.5 flex-1">
            {CICLO_II_ITEMS.map((item) => (
              <GradoCard
                key={item.key}
                gradoKey={item.key}
                emoji={item.emoji}
                bg={item.bg}
                border={item.border}
                label={item.label}
                isSelected={grados.includes(item.key)}
                onToggle={onToggleGrado}
              />
            ))}
          </div>
        </div>
      </div>


      {/* Columna Derecha: Selección de Sección (Con divisor para separar visualmente) */}
      <div className="flex flex-col md:w-[38%] shrink-0 md:border-l-2 md:border-cream-dark/60 md:pl-6 min-h-0 gap-3.5">
        <AnimatePresence mode="wait">
          {!hasGrados ? (
            <div
              key="placeholder"
              className="hidden md:flex flex-col items-center justify-center flex-1 text-center p-6 border-2 border-dashed border-cream-dark/60 rounded-2xl bg-cream/10"
            >
              <span className="text-3xl mb-2 opacity-60">🏫</span>
              <p className="text-sm font-bold text-warm-500">Configura tu sección</p>
              <p className="text-xs text-warm-400/80 mt-1 max-w-[200px]">
                Selecciona al menos una edad a la izquierda para continuar.
              </p>
            </div>
          ) : (
            <motion.div
              key="seccion-content"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="flex flex-col gap-3.5 flex-1 min-h-0"
            >
              <div className="text-xs font-semibold text-warm-500 bg-cream/15 border border-cream-dark/40 rounded-xl px-3 py-2 leading-snug shrink-0 select-none">
                {grados.length > 1
                  ? '🏫 Todos los grados seleccionados comparten la misma sección (unidocencia).'
                  : '🏫 Selecciona la sección de tu aula.'}
              </div>

              <div className="relative flex-1 min-h-0 flex flex-col mt-2">
                {!showCustom ? (
                  <div className="grid grid-cols-2 gap-3 w-full flex-1 min-h-0">
                    {SECCIONES_FIJAS.map((s) => {
                      const active = seccion === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => handleFija(s)}
                          className={[
                            'w-full h-full min-h-[52px] flex items-center justify-center py-3.5 px-4 rounded-2xl border-2 text-sm font-extrabold transition-all duration-200 focus:outline-none focus:ring-warm select-none',
                            active
                              ? 'bg-lilac-500 border-lilac-600 text-white shadow-md'
                              : 'bg-white border-cream-dark text-warm-700 hover:border-lilac-300 hover:bg-lilac-50/50 hover:scale-[1.01]',
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
                      className="w-full h-full min-h-[52px] flex items-center justify-center py-3.5 px-4 rounded-2xl border-2 border-cream-dark bg-white text-sm font-extrabold text-coral-500 hover:border-coral-300 hover:bg-coral-50/50 hover:scale-[1.01] transition-all duration-200 focus:outline-none focus:ring-warm select-none"
                    >
                      Otra…
                    </button>
                  </div>
                ) : (
                  <div className="w-full flex-1 min-h-[160px] flex flex-col justify-center items-center gap-3 p-5 bg-cream/10 border border-dashed border-cream-dark/80 rounded-2xl">
                    <div className="w-full max-w-xs flex flex-col gap-1.5">
                      <label
                        htmlFor="custom-seccion-input"
                        className="text-[11px] font-black text-warm-500 uppercase tracking-wider"
                      >
                        Escribe la sección
                      </label>
                      <input
                        id="custom-seccion-input"
                        type="text"
                        value={custom}
                        onChange={(e) => handleCustomChange(e.target.value)}
                        placeholder="Ej. Celeste, Única, A..."
                        maxLength={20}
                        autoFocus
                        className="w-full text-sm font-bold text-warm-900 placeholder:text-warm-300 bg-white border-2 border-cream-dark rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-lilac-500 transition-colors"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustom(false);
                        setCustom('');
                        onChangeSeccion('');
                      }}
                      className="text-xs font-bold text-warm-400 hover:text-coral-500 transition-colors px-3 py-1.5 rounded-xl hover:bg-coral-50 border border-transparent"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>

              {/* Vista previa del cuaderno de registro (Rediseño físico de cuaderno infantil) */}
              <div className="mt-auto pt-5 border-t border-dashed border-cream-dark/80 flex flex-col gap-2.5 shrink-0">
                <span className="text-[10px] font-black text-warm-400 uppercase tracking-widest pl-1">
                  Tu cuaderno wawita
                </span>
                <div className="bg-white border-2 border-lilac-100 rounded-2xl p-4 flex items-center justify-between shadow-xs relative overflow-hidden transition-all duration-300 hover:border-lilac-300">
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <h4 className="text-sm font-black text-warm-800 leading-tight truncate">
                      {grados.length > 0 ? grados.join(' y ') : 'Selecciona tus grados'}
                    </h4>
                    <p className="text-xs font-semibold text-warm-500 truncate">
                      {seccion ? `Sección "${seccion}"` : 'Sin sección'}
                    </p>
                  </div>

                  {/* Sticker circular decorativo con emojis (orbitando / abanico de stickers) */}
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-cream-dark/60 bg-cream-light/10 relative flex items-center justify-center shrink-0 select-none">
                    {(() => {
                      const selectedItems = grados
                        .map((g) => [...CICLO_I_ITEMS, ...CICLO_II_ITEMS].find((i) => i.key === g))
                        .filter((item): item is (typeof CICLO_I_ITEMS)[number] => !!item);

                      if (selectedItems.length === 0) {
                        return <span className="text-xl">📖</span>;
                      }

                      if (selectedItems.length === 1) {
                        return (
                          <div className="w-10 h-10 rounded-full bg-white border border-cream-dark/60 flex items-center justify-center text-xl shadow-sm transform rotate-6">
                            {selectedItems[0].emoji}
                          </div>
                        );
                      }

                      // Orbiting/stack layout for multiple emojis
                      return (
                        <div className="relative w-full h-full flex items-center justify-center">
                          {selectedItems.map((item, idx) => {
                            const total = selectedItems.length;
                            const angle = (idx * 2 * Math.PI) / total - Math.PI / 2;
                            const radius = 11; // radius in pixels for orbit layout (larger for better spacing)
                            const x = Math.cos(angle) * radius;
                            const y = Math.sin(angle) * radius;

                            const rotations = ['-rotate-12', 'rotate-12', '-rotate-6', 'rotate-6'];
                            const rotClass = rotations[idx % rotations.length];

                            return (
                              <div
                                key={item.key}
                                className={`absolute w-6 h-6 rounded-full bg-white border border-cream-dark/60 flex items-center justify-center text-xs shadow-sm transform ${rotClass} hover:scale-115 hover:z-30 transition-all duration-200`}
                                style={{
                                  transform: `translate(${x}px, ${y}px)`,
                                  zIndex: 10 + idx,
                                }}
                              >
                                {item.emoji}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
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

export default function OnboardingWizard({ curriculum }: OnboardingWizardProps) {
  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<CardDirection>('forward');

  // Paso 1 — grados seleccionados + una sola sección compartida (unidocencia)
  const [grados, setGrados] = useState<string[]>([]);
  const [seccion, setSeccion] = useState('');

  // String para la DB: "3 años, 4 años (A)"
  const gradoStr = grados.length > 0 ? `${grados.join(', ')}${seccion ? ` (${seccion})` : ''}` : '';

  function toggleGrado(key: string) {
    setGrados((prev) => {
      const isCicloI = ['1 año', '2 años'].includes(key);
      if (prev.includes(key)) {
        // Clear section if no grades selected
        const next = prev.filter((g) => g !== key);
        if (next.length === 0) setSeccion('');
        return next;
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

  // Paso 2 — Mis estudiantes
  const [studentNames, setStudentNames] = useState<string[]>([]);
  const [rosterFileError, setRosterFileError] = useState<string | null>(null);
  const [isRosterSaved, setIsRosterSaved] = useState(true);

  // Cargar estudiantes automáticamente cuando cambie el aula (grado o sección)
  // biome-ignore lint/correctness/useExhaustiveDependencies: grados is used to determine empty state but gradoStr dependency triggers the update
  useEffect(() => {
    if (grados.length === 0) {
      setStudentNames([]);
      setIsRosterSaved(true);
      return;
    }
    let cancelled = false;
    fetchStudents(gradoStr, seccion)
      .then((students) => {
        if (cancelled) return;
        const loaded = students.length > 0 ? students.map((s) => s.name) : [];
        setStudentNames(loaded);
        setIsRosterSaved(true);
      })
      .catch((err) => {
        console.error('Error fetching students for onboarding:', err);
      });
    return () => {
      cancelled = true;
    };
  }, [gradoStr, seccion]);

  const [savingRoster, setSavingRoster] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  async function handleSaveRoster() {
    const names = studentNames.map((n) => n.trim()).filter((n) => n.length >= 2);
    if (names.length === 0) return;
    setSavingRoster(true);
    try {
      await saveStudents(gradoStr, seccion, names);
      setIsRosterSaved(true);
      setShowSuccessModal(true);
    } catch (err) {
      console.error(err);
      setRosterFileError('No se pudo guardar');
    } finally {
      setSavingRoster(false);
    }
  }

  function handleStudentNamesChange(newNames: string[]) {
    const currentStr = studentNames.join('||');
    const newStr = newNames.join('||');
    if (currentStr === newStr) return;

    setStudentNames(newNames);
    setIsRosterSaved(false);
  }

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
    return studentNames.filter((n) => n.trim().length >= 2).length >= 1 && isRosterSaved;
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
      setPlanning((prev) => {
        const area = m.area.value || prev.area;
        const competencia = m.competencia.value || prev.competencia;
        const capacities = competencia ? getCapacidades(curriculum, area, competencia) : [];
        return {
          titulo: m.titulo.value || prev.titulo,
          area,
          competencia,
          capacidades: capacities,
          criterios: m.criterio.value ? [m.criterio.value] : prev.criterios,
          evidencia: prev.evidencia,
        };
      });
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
    try {
      await saveStudents(gradoStr, seccion, names);
      await createSession({
        titulo: planning.titulo.trim() || undefined,
        grado: gradoStr,
        seccion: seccion,
        area: planning.area,
        competencia: planning.competencia,
        // Usamos la primera capacidad que el docente seleccionó explícitamente en el Wizard.
        // Al elegir una competencia todas las capacidades se auto-seleccionan, por lo que
        // planning.capacidades[0] siempre está disponible cuando area+competencia están definidos.
        capacidad: planning.capacidades[0] ?? '',
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
        <OnboardingStepCard
          title="Tu aula"
          headerActions={
            <div className="flex items-center gap-2 select-none">
              {grados.length === 0 ? (
                <span className="bg-cream-light/70 border border-cream-dark/70 text-warm-600 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full transition-all duration-300">
                  ✏️ Selecciona tu edad
                </span>
              ) : !seccion ? (
                <span className="bg-coral-50 border border-coral-200 text-coral-600 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full transition-all duration-300 animate-pulse">
                  ✏️ Elige la sección
                </span>
              ) : (
                <span className="bg-emerald-50 border border-emerald-200 text-emerald-600 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full transition-all duration-300 shadow-xs flex items-center gap-1">
                  <span>✓ Aula lista</span>
                </span>
              )}
            </div>
          }
        >
          <AulaStepView grados={grados} onToggleGrado={toggleGrado} seccion={seccion} onChangeSeccion={setSeccion} />
        </OnboardingStepCard>
      ),
    },
    {
      id: 2,
      content: (
        <div className="relative flex flex-1 min-h-0 w-full flex-col">
          <OnboardingStepCard
            title="Mis estudiantes"
            headerActions={
              <RosterHeaderActions
                fileError={rosterFileError}
                onFileError={setRosterFileError}
                onFileImport={(parsed) => {
                  const existing = studentNames.filter((n) => n.trim().length >= 2);
                  setStudentNames([...new Set([...existing, ...parsed])]);
                  setIsRosterSaved(false);
                  setRosterFileError(null);
                }}
              />
            }
          >
            <StudentsRosterInput names={studentNames} onChange={handleStudentNamesChange} />
          </OnboardingStepCard>

          {/* Floating Save Button */}
          <AnimatePresence>
            {!isRosterSaved && studentNames.filter((n) => n.trim().length >= 2).length >= 1 && (
              <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 450, damping: 30 }}
                className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30"
              >
                <button
                  type="button"
                  disabled={savingRoster}
                  onClick={handleSaveRoster}
                  className="flex items-center gap-2 bg-gradient-to-r from-lilac-500 to-indigo-500 hover:from-lilac-600 hover:to-indigo-600 text-white font-extrabold px-6 py-3 rounded-full shadow-lg shadow-lilac-300/60 hover:shadow-xl active:scale-95 transition-all text-sm shrink-0 border border-white/20 select-none cursor-pointer"
                >
                  <span>{savingRoster ? '💾 Guardando...' : '💾 Guardar listado de estudiantes'}</span>
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
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

    <div className="flex flex-col h-full min-h-0 w-full max-w-7xl mx-auto p-3 sm:p-5 md:py-4 md:px-8 overflow-hidden">
      {/* Playful Stepper Hybrid (Pills on a dotted path) */}
      <div className="shrink-0 relative flex items-center justify-between w-full max-w-3xl mx-auto mb-4 px-2 sm:px-6 select-none">
        {/* Steps and Connectors */}
        {STEPS.map((label, index) => {
          const s = index + 1;
          const isActive = s === step;
          const isComplete = isStepComplete(s) && s < step;

          // Compute summary metadata dynamically (empty if no data yet)
          let summaryText = '';
          if (s === 1) {
            const compactGradoStr = (() => {
              if (grados.length === 0) return '';
              const numbers = grados.map((g) => g.replace(/\s*año(s)?/g, ''));
              const seccionSuffix = seccion ? ` (${seccion})` : '';
              if (numbers.length === 1) return `${grados[0]}${seccionSuffix}`;
              const last = numbers.pop();
              return `${numbers.join(', ')} y ${last} años${seccionSuffix}`;
            })();
            summaryText = isStep1Complete() ? compactGradoStr : '';
          } else if (s === 2) {
            const count = studentNames.filter((n) => n.trim().length >= 2).length;
            summaryText = isStep2Complete() ? `${count} estudiantes` : '';
          } else if (s === 3) {
            summaryText = isStep3Complete()
              ? planning.titulo.length > 14
                ? planning.titulo.substring(0, 12) + '...'
                : planning.titulo
              : '';
          }

          return (
            <Fragment key={s}>
              <button
                type="button"
                disabled={!isComplete && !isActive}
                onClick={() => isComplete && goTo(s)}
                className={[
                  'relative flex items-center gap-2 pl-1.5 pr-3.5 py-1.5 rounded-full text-xs font-black tracking-wide uppercase transition-all duration-300 focus:outline-none select-none z-10 shadow-md shrink-0',
                  isActive
                    ? 'bg-coral-500 text-white scale-105 border-2 border-white ring-4 ring-coral-100/50'
                    : isComplete
                      ? 'bg-lilac-500 text-white border-2 border-white cursor-pointer hover:bg-lilac-600'
                      : 'bg-white border-2 border-cream-dark/80 text-warm-400 cursor-default',
                ].join(' ')}
              >
                {/* Circular Emoji Badge */}
                <span
                  className={[
                    'w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 shadow-xs',
                    isActive || isComplete ? 'bg-white' : 'bg-cream-dark/50',
                  ].join(' ')}
                >
                  {STEP_EMOJI[s]}
                </span>
                <span className="shrink-0">{label}</span>

                {/* Vertical divider + Summary Text (only if summary exists) */}
                {summaryText && (
                  <>
                    <span
                      className="h-3 border-l opacity-35 mx-1.5 shrink-0 select-none"
                      style={{ borderColor: isActive || isComplete ? '#fff' : 'var(--color-cream-dark)' }}
                    />
                    <span
                      className={[
                        'normal-case shrink-0 select-none font-bold text-xs tracking-normal',
                        isActive || isComplete ? 'text-white/95' : 'text-warm-400/80',
                      ].join(' ')}
                    >
                      {summaryText}
                    </span>
                  </>
                )}

                {isComplete && <span className="ml-1 text-[10px] font-black text-white shrink-0">✓</span>}
              </button>

              {s < 3 && (
                <div className="flex-1 min-w-[20px] md:min-w-[40px] h-1.5 mx-2 shrink-0 select-none pointer-events-none relative">
                  <svg className="w-full h-full overflow-visible" preserveAspectRatio="none">
                    <line
                      x1="0"
                      y1="3"
                      x2="100%"
                      y2="3"
                      stroke="#a78bfa"
                      strokeOpacity={isComplete ? 0.85 : 0.35}
                      strokeWidth="4"
                      strokeDasharray="6 10"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>

      {/* CONTENT COLUMN WITH INTEGRATED NAVIGATION */}
      <div className="relative flex-1 min-h-0 w-full flex flex-col gap-3">
        {/* Step Card Container */}
        <div className="flex-1 min-h-0 flex flex-col">
          <CardStack cards={stackCards} activeStep={step} direction={direction} />
        </div>

        {/* UNIFIED NAVIGATION BAR */}
        <div className="shrink-0 pt-2 flex items-center justify-between gap-4 border-t border-cream-dark/60 select-none">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => goTo(step - 1)}
              className="flex items-center gap-2 rounded-2xl border-2 border-cream-dark bg-white px-5 sm:px-6 py-2.5 sm:py-3 text-sm font-extrabold text-warm-700 hover:border-warm-300 hover:bg-cream/40 transition-all active:scale-97 cursor-pointer shadow-2xs"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
              <span>Atrás</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={() => {
              if (step < 3) goTo(step + 1);
              else handleStartSession();
            }}
            disabled={!canAdvance()}
            className={[
              'flex items-center justify-center gap-2.5 rounded-2xl px-7 sm:px-9 py-3 sm:py-3.5 text-sm sm:text-base font-extrabold transition-all duration-200 shadow-md select-none',
              canAdvance()
                ? 'bg-coral-500 hover:bg-coral-600 text-white cursor-pointer active:scale-98'
                : 'bg-warm-100/90 text-warm-400 border border-warm-200/80 cursor-not-allowed opacity-65',
            ].join(' ')}
          >
            {step === 3 ? (
              <span>🚀 ¡Empezar clase!</span>
            ) : (
              <>
                <span>Siguiente paso</span>
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de Confirmación de Guardado */}

      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSuccessModal(false)}
              className="absolute inset-0 bg-warm-900/60 backdrop-blur-xs"
            />

            {/* Modal Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: 'spring', stiffness: 400, damping: 28 }}
              className="relative w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl border border-cream-dark/60 flex flex-col items-center text-center gap-4 z-10"
            >
              {/* Animated check circle */}
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-3xl shadow-inner animate-bounce">
                ✅
              </div>

              <div>
                <h3 className="text-lg font-black text-warm-900 tracking-tight">¡Estudiantes guardados!</h3>
                <p className="text-xs text-warm-500 mt-1.5 leading-relaxed">
                  Guardamos la lista de tus{' '}
                  <strong>{studentNames.filter((n) => n.trim().length >= 2).length} estudiantes</strong> con éxito.
                  ¿Deseas pasar a planificar?
                </p>
              </div>

              <div className="flex flex-col gap-2 w-full mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccessModal(false);
                    goTo(3); // Avanzar automáticamente al paso 3!
                  }}
                  className="w-full py-3 bg-gradient-to-r from-coral-500 to-orange-500 text-white font-extrabold rounded-2xl shadow-md hover:from-coral-600 hover:to-orange-600 active:scale-97 transition-all text-xs cursor-pointer select-none"
                >
                  Continuar a Planificación ➡️
                </button>
                <button
                  type="button"
                  onClick={() => setShowSuccessModal(false)}
                  className="w-full py-2.5 bg-cream/30 hover:bg-cream/60 border border-cream-dark text-warm-700 font-extrabold rounded-2xl active:scale-97 transition-all text-xs cursor-pointer select-none"
                >
                  Seguir editando
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
