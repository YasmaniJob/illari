/**
 * EditSessionDrawer — Panel lateral deslizante para editar la sesión activa.
 * Desktop: drawer lateral derecho con overlay semitransparente.
 * Mobile: bottom sheet que sube desde abajo.
 */
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchStudents, patchSession, type StudentDto } from '../../lib/api/client';
import { GRADOS, SECCIONES } from '../../lib/classroom';
import type { CurriculumRow, SessionConfig } from '../../lib/curriculum';
import { getAreas, getCapacidades, getCompetencias } from '../../lib/curriculum';
import StudentsRosterInput from '../onboarding/StudentsRosterInput';
import CustomSelect from '../ui/CustomSelect';

interface Props {
  session: SessionConfig;
  onClose: () => void;
  onSaved: (updated: SessionConfig, students: StudentDto[]) => void;
}

type Section = 'aula' | 'estudiantes' | 'planificacion';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({
  label,
  emoji,
  open,
  onToggle,
  dirty,
}: {
  label: string;
  emoji: string;
  open: boolean;
  onToggle: () => void;
  dirty?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-cream/60 transition-colors focus-ring-warm"
    >
      <span className="text-xl" aria-hidden>
        {emoji}
      </span>
      <span className="flex-1 text-sm font-extrabold text-warm-900">{label}</span>
      {dirty && <span className="h-2 w-2 rounded-full bg-coral-500 shrink-0" title="Cambios sin guardar" />}
      <svg
        className={`h-4 w-4 text-warm-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </button>
  );
}

// ─── Save button with feedback ────────────────────────────────────────────────

function SaveButton({ state, disabled, onClick }: { state: SaveState; disabled: boolean; onClick: () => void }) {
  const styles = {
    idle: 'bg-coral-500 hover:bg-coral-600 text-white',
    saving: 'bg-coral-500 text-white opacity-70 cursor-wait',
    saved: 'bg-mint-400/20 border border-mint-400/50 text-warm-900',
    error: 'bg-coral-500/10 border border-coral-500/30 text-coral-600',
  }[state];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || state === 'saving'}
      className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-all duration-200 focus-ring-warm ${styles}`}
    >
      {state === 'saving' && (
        <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
      )}
      {state === 'saved' && (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )}
      {state === 'error' && (
        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )}
      {state === 'idle' && (
        <svg
          className="h-3.5 w-3.5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
          <polyline points="17 21 17 13 7 13 7 21" />
          <polyline points="7 3 7 8 15 8" />
        </svg>
      )}
      {state === 'saving' ? 'Guardando…' : state === 'saved' ? '¡Guardado!' : state === 'error' ? 'Error' : 'Guardar'}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function EditSessionDrawer({ session, onClose, onSaved }: Props) {
  const [openSection, setOpenSection] = useState<Section>('planificacion');
  const [curriculum, setCurriculum] = useState<CurriculumRow[]>([]);
  const [saveStates, setSaveStates] = useState<Record<Section, SaveState>>({
    aula: 'idle',
    estudiantes: 'idle',
    planificacion: 'idle',
  });
  const [errors, setErrors] = useState<Partial<Record<Section, string>>>({});

  // ── Aula state ──────────────────────────────────────────────────────────────
  const [grados, setGrados] = useState<string[]>(
    session.grado
      ? session.grado
          .split(',')
          .map((g) => g.trim())
          .filter(Boolean)
      : [],
  );
  const [seccion, setSeccion] = useState(session.seccion ?? '');
  const [showCustomSeccion, setShowCustomSeccion] = useState(
    !!session.seccion && !SECCIONES.includes(session.seccion as (typeof SECCIONES)[number]),
  );
  const gradoStr = grados.join(', ');
  const aulaDirty = gradoStr !== (session.grado ?? '') || seccion !== (session.seccion ?? '');

  // ── Estudiantes state ───────────────────────────────────────────────────────
  const [studentNames, setStudentNames] = useState<string[]>([]);
  const [studentsLoaded, setStudentsLoaded] = useState(false);
  const [studentsDirty, setStudentsDirty] = useState(false);
  const originalNamesRef = useRef<string[]>([]);

  // ── Planificación state ─────────────────────────────────────────────────────
  const [titulo, setTitulo] = useState(session.titulo ?? '');
  const [area, setArea] = useState(session.area);
  const [competencia, setCompetencia] = useState(session.competencia);
  const [capacidad, setCapacidad] = useState(session.capacidad);
  const [criterios, setCriterios] = useState<string[]>(
    session.criterio ? session.criterio.split('; ').filter(Boolean) : ['']
  );
  const criterioRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [evidencia, setEvidencia] = useState(session.evidencia ?? '');
  const planDirty =
    titulo !== (session.titulo ?? '') ||
    area !== session.area ||
    competencia !== session.competencia ||
    capacidad !== session.capacidad ||
    criterios.filter((c) => c.trim().length >= 2).join('; ') !== (session.criterio ?? '') ||
    evidencia !== (session.evidencia ?? '');

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
          area,
          competencia,
          capacidades: capacidad ? [capacidad] : [],
          evidencia,
          edad: session.grado,
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

  // ── Load curriculum ─────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('/api/curriculum')
      .then((r) => r.json())
      .then((d: { curriculum: CurriculumRow[] }) => setCurriculum(d.curriculum))
      .catch(() => {});
  }, []);

  // ── Load students when section opens ───────────────────────────────────────
  useEffect(() => {
    if (openSection !== 'estudiantes' || studentsLoaded) return;
    if (!session.grado || !session.seccion) {
      setStudentsLoaded(true);
      return;
    }
    fetchStudents(session.grado, session.seccion)
      .then((studs) => {
        const names = studs.map((s) => s.name);
        setStudentNames(names);
        originalNamesRef.current = names;
        setStudentsLoaded(true);
      })
      .catch(() => setStudentsLoaded(true));
  }, [openSection, studentsLoaded, session.grado, session.seccion]);

  // ── Block body scroll ───────────────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // ── Escape to close ─────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleStudentNamesChange = useCallback((names: string[]) => {
    setStudentNames(names);
    setStudentsDirty(true);
  }, []);

  // ── Curriculum cascades ─────────────────────────────────────────────────────
  const areas = useMemo(() => getAreas(curriculum), [curriculum]);
  const competencias = useMemo(() => (area ? getCompetencias(curriculum, area) : []), [curriculum, area]);
  const capacidades = useMemo(
    () => (area && competencia ? getCapacidades(curriculum, area, competencia) : []),
    [curriculum, area, competencia],
  );

  function handleAreaChange(val: string) {
    setArea(val);
    setCompetencia('');
    setCapacidad('');
    setCriterios(['']);
    setSuggestions([]);
    setErrorSuggestions(null);
  }
  function handleCompetenciaChange(val: string) {
    setCompetencia(val);
    setCapacidad('');
    setCriterios(['']);
    setSuggestions([]);
    setErrorSuggestions(null);
  }
  function handleCapacidadChange(val: string) {
    setCapacidad(val);
    setCriterios(['']);
    setSuggestions([]);
    setErrorSuggestions(null);
  }

  // ── Save helpers ────────────────────────────────────────────────────────────
  function setSave(s: Section, state: SaveState) {
    setSaveStates((prev) => ({ ...prev, [s]: state }));
  }
  function flashSaved(s: Section) {
    setSave(s, 'saved');
    setTimeout(() => setSave(s, 'idle'), 2000);
  }

  async function saveAula() {
    setSave('aula', 'saving');
    setErrors((e) => ({ ...e, aula: undefined }));
    try {
      const updated = await patchSession(session.id, { grado: gradoStr, seccion });
      onSaved(updated, []);
      flashSaved('aula');
    } catch (err) {
      setSave('aula', 'error');
      setErrors((e) => ({ ...e, aula: err instanceof Error ? err.message : 'Error al guardar' }));
      setTimeout(() => setSave('aula', 'idle'), 2000);
    }
  }

  async function saveEstudiantes() {
    setSave('estudiantes', 'saving');
    setErrors((e) => ({ ...e, estudiantes: undefined }));
    try {
      const validNames = studentNames.filter((n) => n.trim().length >= 2);
      const updated = await patchSession(session.id, {
        grado: gradoStr || session.grado,
        seccion: seccion || session.seccion,
        studentNames: validNames,
      });
      const studs = await fetchStudents(updated.grado ?? '', updated.seccion ?? '');
      originalNamesRef.current = studs.map((s) => s.name);
      setStudentsDirty(false);
      onSaved(updated, studs);
      flashSaved('estudiantes');
    } catch (err) {
      setSave('estudiantes', 'error');
      setErrors((e) => ({ ...e, estudiantes: err instanceof Error ? err.message : 'Error al guardar' }));
      setTimeout(() => setSave('estudiantes', 'idle'), 2000);
    }
  }

  async function savePlanificacion() {
    setSave('planificacion', 'saving');
    setErrors((e) => ({ ...e, planificacion: undefined }));
    try {
      const cleanCriterio = criterios.filter((c) => c.trim().length >= 2).join('; ');
      const updated = await patchSession(session.id, {
        titulo,
        area,
        competencia,
        capacidad,
        criterio: cleanCriterio,
        evidencia,
      });
      onSaved(updated, []);
      flashSaved('planificacion');
    } catch (err) {
      setSave('planificacion', 'error');
      setErrors((e) => ({ ...e, planificacion: err instanceof Error ? err.message : 'Error al guardar' }));
      setTimeout(() => setSave('planificacion', 'idle'), 2000);
    }
  }

  function toggle(s: Section) {
    setOpenSection((prev) => (prev === s ? 'planificacion' : s));
  }

  // ── Inner content ───────────────────────────────────────────────────────────
  const drawerContent = (
    <>
      {/* Overlay — semitransparente en desktop, más oscuro en mobile */}
      <div
        className="fixed inset-0 z-40 bg-black/20 sm:bg-black/30 backdrop-blur-[1px]"
        aria-hidden="true"
        onClick={onClose}
      />

      {/* Drawer — lateral en desktop, bottom sheet en mobile */}
      <aside
        className={[
          'fixed z-50 flex flex-col bg-white shadow-2xl',
          // Mobile: bottom sheet
          'bottom-0 left-0 right-0 rounded-t-3xl max-h-[90dvh]',
          // Desktop: right drawer
          'sm:bottom-0 sm:top-0 sm:left-auto sm:right-0 sm:rounded-none sm:rounded-l-2xl sm:w-[380px] sm:max-h-none sm:h-full',
        ].join(' ')}
        style={{ animation: 'slideUp 0.28s cubic-bezier(0.32,0.72,0,1) both' }}
        role="dialog"
        aria-modal="true"
        aria-label="Editar sesión"
      >
        {/* Handle — solo mobile */}
        <div className="flex justify-center pt-3 pb-1 sm:hidden shrink-0">
          <div className="h-1 w-10 rounded-full bg-warm-500/20" />
        </div>

        {/* Header */}
        <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-cream-dark">
          <div className="flex-1 min-w-0">
            <p className="text-base font-extrabold text-warm-900">Editar sesión</p>
            <p className="text-xs font-semibold text-warm-500 truncate">{session.titulo || session.area}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-warm-400 hover:bg-gray-100 hover:text-warm-900 transition-colors focus-ring-warm"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto divide-y divide-cream-dark overscroll-contain">
          {/* ── Tu aula ── */}
          <div>
            <SectionHeader
              label="Tu aula"
              emoji="🏫"
              open={openSection === 'aula'}
              onToggle={() => toggle('aula')}
              dirty={aulaDirty}
            />
            {openSection === 'aula' && (
              <div className="px-5 pb-5 space-y-4">
                <div>
                  <p className="text-xs font-bold text-warm-700 mb-2">Grado</p>
                  <div className="grid grid-cols-3 gap-2">
                    {GRADOS.map((g) => {
                      const active = grados.includes(g);
                      return (
                        <button
                          key={g}
                          type="button"
                          onClick={() =>
                            setGrados((prev) => (prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]))
                          }
                          aria-pressed={active}
                          className={[
                            'rounded-xl border-2 py-2.5 text-sm font-bold transition-all duration-150 focus-ring-warm',
                            active
                              ? 'border-coral-500 bg-coral-500/10 text-coral-700'
                              : 'border-cream-dark bg-white text-warm-600 hover:border-lilac-300',
                          ].join(' ')}
                        >
                          {g}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-bold text-warm-700 mb-2">Sección</p>
                  <div className="grid grid-cols-4 gap-2">
                    {SECCIONES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => {
                          setSeccion(s);
                          setShowCustomSeccion(false);
                        }}
                        aria-pressed={seccion === s && !showCustomSeccion}
                        className={[
                          'rounded-xl border-2 py-2.5 text-sm font-bold transition-all duration-150 focus-ring-warm',
                          seccion === s && !showCustomSeccion
                            ? 'border-coral-500 bg-coral-500/10 text-coral-700'
                            : 'border-cream-dark bg-white text-warm-600 hover:border-lilac-300',
                        ].join(' ')}
                      >
                        {s}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowCustomSeccion((v) => !v)}
                      className={[
                        'rounded-xl border-2 py-2.5 text-sm font-bold transition-all duration-150 focus-ring-warm',
                        showCustomSeccion
                          ? 'border-lilac-400 bg-lilac-100/60 text-lilac-700'
                          : 'border-cream-dark bg-white text-warm-500 hover:border-lilac-300',
                      ].join(' ')}
                    >
                      Otro…
                    </button>
                  </div>
                  {/* Input personalizado — solo visible cuando se activa */}
                  <div
                    className="grid transition-all duration-300 ease-in-out"
                    style={{ gridTemplateRows: showCustomSeccion ? '1fr' : '0fr' }}
                  >
                    <div className="overflow-hidden">
                      <input
                        type="text"
                        value={showCustomSeccion ? seccion : ''}
                        onChange={(e) => setSeccion(e.target.value)}
                        placeholder="Ej. D, Celeste, Pollitos…"
                        className="input-warm mt-2 text-sm"
                        maxLength={20}
                        tabIndex={showCustomSeccion ? 0 : -1}
                      />
                    </div>
                  </div>
                </div>

                {errors.aula && <p className="text-xs font-semibold text-coral-600">{errors.aula}</p>}
                <div className="flex justify-end">
                  <SaveButton
                    state={saveStates.aula}
                    disabled={!aulaDirty || grados.length === 0 || !seccion}
                    onClick={saveAula}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Estudiantes ── */}
          <div>
            <SectionHeader
              label="Mis estudiantes"
              emoji="👥"
              open={openSection === 'estudiantes'}
              onToggle={() => toggle('estudiantes')}
              dirty={studentsDirty}
            />
            {openSection === 'estudiantes' && (
              <div className="px-5 pb-5 space-y-3">
                {!studentsLoaded ? (
                  <div className="flex justify-center py-6">
                    <span className="h-6 w-6 rounded-full border-2 border-coral-500 border-t-transparent animate-spin" />
                  </div>
                ) : (
                  <div className="min-h-[160px] flex flex-col">
                    <StudentsRosterInput names={studentNames} onChange={handleStudentNamesChange} />
                  </div>
                )}
                {errors.estudiantes && <p className="text-xs font-semibold text-coral-600">{errors.estudiantes}</p>}
                <div className="flex justify-end">
                  <SaveButton
                    state={saveStates.estudiantes}
                    disabled={!studentsDirty || studentNames.filter((n) => n.trim().length >= 2).length === 0}
                    onClick={saveEstudiantes}
                  />
                </div>
              </div>
            )}
          </div>

          {/* ── Planificación ── */}
          <div>
            <SectionHeader
              label="Planificación"
              emoji="📚"
              open={openSection === 'planificacion'}
              onToggle={() => toggle('planificacion')}
              dirty={planDirty}
            />
            {openSection === 'planificacion' && (
              <div className="px-5 pb-5 space-y-4">
                <div>
                  <label htmlFor="edit-titulo" className="text-xs font-bold text-warm-700 mb-1.5 block">
                    Título de la sesión
                  </label>
                  <input
                    id="edit-titulo"
                    type="text"
                    value={titulo}
                    onChange={(e) => setTitulo(e.target.value)}
                    placeholder="Ej.: Jugamos con los números"
                    className="input-warm text-sm"
                  />
                </div>

                <CustomSelect
                  label="Área"
                  value={area}
                  options={areas}
                  placeholder="Elegir área…"
                  onChange={handleAreaChange}
                />
                <CustomSelect
                  label="Competencia"
                  value={competencia}
                  options={competencias}
                  placeholder={area ? 'Elegir competencia…' : 'Primero elige área'}
                  disabled={!area}
                  onChange={handleCompetenciaChange}
                />

                {competencia && capacidades.length > 0 && (
                  <CustomSelect
                    label="Capacidad"
                    value={capacidad}
                    options={capacidades}
                    placeholder="Elegir capacidad…"
                    onChange={handleCapacidadChange}
                  />
                )}

                <div>
                  <div className="flex items-center justify-between gap-4 mb-2">
                    <label className="text-xs font-bold text-warm-700 mb-0">
                      Criterios de evaluación
                    </label>
                    <button
                      type="button"
                      onClick={handleSuggest}
                      disabled={loadingSuggestions}
                      className="inline-flex items-center gap-1.2 rounded-xl border border-lilac-200 bg-lilac-50/70 px-2.5 py-1 text-[11px] font-bold text-lilac-700 hover:bg-lilac-100 hover:border-lilac-300 hover:text-lilac-800 transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:cursor-wait shadow-sm"
                    >
                      {loadingSuggestions ? (
                        <span className="h-3 w-3 rounded-full border-2 border-lilac-500 border-t-transparent animate-spin block" />
                      ) : (
                        <span className="text-xs animate-pulse">✨</span>
                      )}
                      <span>Sugerir criterios</span>
                    </button>
                  </div>

                  {errorSuggestions && (
                    <p className="text-xs text-coral-600 font-semibold mb-2">⚠ {errorSuggestions}</p>
                  )}

                  {suggestions.length > 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-lilac-200 bg-lilac-50/20 p-3.5 mb-3">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-lilac-600 mb-2">
                        Sugerencias de la IA (Haz clic para agregar)
                      </p>
                      <div className="flex flex-col gap-1.5">
                        {suggestions.map((sug, i) => {
                          const cleanAdded = criterios.map((c) => c.trim()).filter(Boolean);
                          const alreadyAdded = cleanAdded.includes(sug.trim());
                          return (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                if (!alreadyAdded) {
                                  const emptyIndex = criterios.findIndex((c) => c.trim() === '');
                                  if (emptyIndex !== -1) {
                                    const next = [...criterios];
                                    next[emptyIndex] = sug;
                                    setCriterios(next);
                                  } else {
                                    setCriterios((prev) => [...prev, sug]);
                                  }
                                }
                              }}
                              disabled={alreadyAdded}
                              className={[
                                'text-xs font-semibold leading-relaxed text-left px-3 py-2 rounded-xl border transition-all duration-200 focus:outline-none w-full',
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

                  {/* Lista de campos de entrada por criterio */}
                  <div className="flex flex-col gap-2">
                    {criterios.map((crit, index) => {
                      const isLast = index === criterios.length - 1;
                      return (
                        <div key={index} className="flex items-center gap-2">
                          <input
                            ref={(el) => { criterioRefs.current[index] = el; }}
                            type="text"
                            value={crit}
                            onChange={(e) => {
                              const next = [...criterios];
                              next[index] = e.target.value;
                              setCriterios(next);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && isLast && crit.trim() !== '') {
                                e.preventDefault();
                                setCriterios((prev) => {
                                  const next = [...prev, ''];
                                  setTimeout(() => criterioRefs.current[next.length - 1]?.focus(), 30);
                                  return next;
                                });
                              }
                            }}
                            placeholder={`Ej. Describe el criterio de evaluación ${index + 1}…`}
                            className="flex-1 input-warm"
                          />
                          {criterios.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setCriterios((prev) => prev.filter((_, i) => i !== index))}
                              className="p-1.5 text-warm-400 hover:text-coral-500 hover:bg-coral-500/10 rounded-lg transition-all duration-200 active:scale-[0.97]"
                              title="Eliminar criterio"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              </svg>
                            </button>
                          )}
                          {isLast && (
                            <button
                              type="button"
                              disabled={crit.trim() === ''}
                              onClick={() => setCriterios((prev) => {
                                const next = [...prev, ''];
                                setTimeout(() => criterioRefs.current[next.length - 1]?.focus(), 30);
                                return next;
                              })}
                              className="shrink-0 flex items-center justify-center h-[52px] w-[52px] rounded-xl border-2 border-dashed border-cream-dark bg-white text-warm-500 hover:border-coral-500/40 hover:text-coral-500 hover:bg-coral-500/5 transition-all duration-200 active:scale-[0.95] disabled:opacity-35 disabled:cursor-not-allowed disabled:active:scale-100"
                              title="Agregar criterio"
                              aria-label="Agregar criterio"
                            >
                              <span aria-hidden="true" className="text-xl font-light leading-none">+</span>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label htmlFor="edit-evidencia" className="text-xs font-bold text-warm-700 mb-1.5 block">
                    Evidencia de aprendizaje
                  </label>
                  <input
                    id="edit-evidencia"
                    type="text"
                    value={evidencia}
                    onChange={(e) => setEvidencia(e.target.value)}
                    placeholder="Describe la evidencia de aprendizaje…"
                    className="input-warm text-sm"
                  />
                </div>

                {errors.planificacion && <p className="text-xs font-semibold text-coral-600">{errors.planificacion}</p>}
                <div className="flex justify-end">
                  <SaveButton
                    state={saveStates.planificacion}
                    disabled={!planDirty || !area || !competencia}
                    onClick={savePlanificacion}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Safe area bottom */}
          <div style={{ height: 'env(safe-area-inset-bottom, 1rem)' }} />
        </div>
      </aside>
    </>
  );

  return typeof document !== 'undefined' ? createPortal(drawerContent, document.body) : null;
}

export default memo(EditSessionDrawer);
