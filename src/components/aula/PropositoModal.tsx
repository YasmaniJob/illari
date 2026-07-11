/**
 * PropositoModal — Muestra el propósito de aprendizaje de la sesión activa.
 * Incluye: título, grado, sección, área, competencia, capacidad y criterio.
 */
import { memo, useCallback } from 'react';
import type { SessionConfig } from '../../lib/curriculum';

interface Props {
  session: SessionConfig;
  onClose: () => void;
}

interface FieldProps {
  label: string;
  value: string | undefined | null;
  accent?: 'coral' | 'lilac' | 'mint' | 'honey';
  large?: boolean;
}

const ACCENT_STYLES = {
  coral: 'bg-coral-500/10 border-coral-500/20 text-coral-700',
  lilac: 'bg-lilac-100 border-lilac-200 text-lilac-800',
  mint: 'bg-mint-400/15 border-mint-400/30 text-mint-700',
  honey: 'bg-honey-200/60 border-honey-400/30 text-warm-800',
};

function Field({ label, value, accent, large }: FieldProps) {
  if (!value) return null;
  const accentClass = accent ? ACCENT_STYLES[accent] : 'bg-cream border-cream-dark text-warm-800';
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-extrabold uppercase tracking-widest text-warm-400">{label}</span>
      <div className={`rounded-xl border px-4 py-3 ${accentClass}`}>
        <p className={`font-semibold leading-snug ${large ? 'text-base' : 'text-sm'}`}>{value}</p>
      </div>
    </div>
  );
}

function PropositoModal({ session, onClose }: Props) {
  const handleOverlay = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  const fecha = new Date(session.createdAt)
    .toLocaleDateString('es-PE', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'America/Lima',
    })
    .replace(/\b\w/g, (c, i) => (i === 0 ? c.toUpperCase() : c.toLowerCase()));

  const gradoSeccion = [session.grado, session.seccion ? `Sección ${session.seccion}` : null]
    .filter(Boolean)
    .join(' · ');

  // El título solo es relevante si es distinto del área (evita duplicado en header)
  const tituloDistinto = session.titulo && session.titulo !== session.area ? session.titulo : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-8"
      role="dialog"
      aria-modal="true"
      aria-label="Propósito de aprendizaje"
      onClick={handleOverlay}
    >
      <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden">
        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 bg-gradient-to-br from-lilac-100/60 via-white to-honey-200/30 border-b border-cream-dark">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {/* Badge */}
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mint-400/15 border border-mint-400/30 px-2.5 py-0.5 text-xs font-bold text-mint-600 mb-3">
                <span className="h-1.5 w-1.5 rounded-full bg-mint-400 animate-pulse" />
                Clase en curso
              </span>

              {/* Grado · Sección · Fecha — contexto primero */}
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {gradoSeccion && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-white border border-cream-dark px-2.5 py-1 text-xs font-bold text-warm-700">
                    🏫 {gradoSeccion}
                  </span>
                )}
                <span className="text-xs font-semibold text-warm-400">{fecha}</span>
              </div>

              {/* Título — solo si existe y es distinto del área */}
              {tituloDistinto && (
                <h2 className="text-xl font-extrabold text-warm-900 leading-snug">{tituloDistinto}</h2>
              )}
            </div>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-warm-400 hover:bg-gray-100 hover:text-warm-900 transition-colors focus-ring-warm"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
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
        </div>

        {/* ── Body ── */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Propósito de aprendizaje */}
          <div className="rounded-2xl bg-gradient-to-br from-lilac-100/80 to-lilac-50 border border-lilac-200 px-5 py-4 space-y-3">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-lilac-500">
              Propósito de aprendizaje
            </p>
            <Field label="Área curricular" value={session.area} accent="lilac" />
            <Field label="Competencia" value={session.competencia} accent="lilac" large />
            {session.capacidad && <Field label="Capacidad" value={session.capacidad} accent="lilac" />}
          </div>

          {/* Criterio de evaluación */}
          {session.criterio && <Field label="Criterio de evaluación" value={session.criterio} accent="coral" />}

          {/* Evidencia de aprendizaje */}
          {session.evidencia && <Field label="Evidencia de aprendizaje" value={session.evidencia} accent="mint" />}
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-cream-dark flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-warm-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-warm-800 transition-colors focus-ring-warm"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(PropositoModal);
