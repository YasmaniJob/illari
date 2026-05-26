/**
 * AulaStep — Paso 1 del wizard.
 * Grado (cards verticales con icono + color por edad) y Sección (botones + "Otro…" con input inline).
 */
import { useState } from 'react';
import { GRADOS, SECCIONES } from '../../lib/classroom';

// ─── Config visual por grado ──────────────────────────────────────────────────

const GRADO_CONFIG: Record<string, { emoji: string; activeBg: string; activeBorder: string; activeText: string }> = {
  '3 años': {
    emoji: '🐣',
    activeBg: 'bg-[#fef9c3]',
    activeBorder: 'border-[#ca8a04]',
    activeText: 'text-[#854d0e]',
  },
  '4 años': {
    emoji: '🌱',
    activeBg: 'bg-[#dcfce7]',
    activeBorder: 'border-[#16a34a]',
    activeText: 'text-[#14532d]',
  },
  '5 años': {
    emoji: '🦋',
    activeBg: 'bg-[#dbeafe]',
    activeBorder: 'border-[#2563eb]',
    activeText: 'text-[#1e3a8a]',
  },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface AulaStepProps {
  grado: string;
  seccion: string;
  onGradoChange: (v: string) => void;
  onSeccionChange: (v: string) => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AulaStep({ grado, seccion, onGradoChange, onSeccionChange }: AulaStepProps) {
  // "Otro" section logic
  const FIXED_SECCIONES = [...SECCIONES] as string[];
  const isOtro = !!seccion && !FIXED_SECCIONES.includes(seccion);
  const [otroActive, setOtroActive] = useState(isOtro);
  const [otroValue, setOtroValue] = useState(isOtro ? seccion : '');

  function handleSeccionClick(s: string) {
    setOtroActive(false);
    setOtroValue('');
    onSeccionChange(s);
  }

  function handleOtroClick() {
    setOtroActive(true);
    // Si ya había un valor custom, lo mantiene seleccionado
    onSeccionChange(otroValue);
  }

  function handleOtroInput(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setOtroValue(v);
    onSeccionChange(v);
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 justify-center gap-8">

      {/* ── Grado: cards verticales grandes ── */}
      <div>
        <div className="grid grid-cols-3 gap-4">
          {GRADOS.map((g) => {
            const cfg = GRADO_CONFIG[g];
            const isActive = grado === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => onGradoChange(g)}
                className={[
                  'flex flex-col items-center justify-center gap-3 rounded-3xl border-2 py-7 px-3',
                  'transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-lilac-500/25',
                  'active:scale-[0.97]',
                  isActive
                    ? `${cfg.activeBg} ${cfg.activeBorder} ${cfg.activeText} shadow-md`
                    : 'border-cream-dark bg-white text-warm-500 hover:border-lilac-200 hover:bg-cream/60',
                ].join(' ')}
                aria-pressed={isActive}
              >
                <span className="text-4xl leading-none" aria-hidden>{cfg.emoji}</span>
                <span className={`text-base font-extrabold leading-tight text-center ${isActive ? '' : 'text-warm-700'}`}>
                  {g}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Sección ── */}
      <div>
        <p className="text-base font-bold text-warm-900 mb-3">Sección</p>
        <div className="flex flex-wrap gap-2">
          {FIXED_SECCIONES.map((s) => {
            const isActive = !otroActive && seccion === s;
            return (
              <button
                key={s}
                type="button"
                onClick={() => handleSeccionClick(s)}
                className={[
                  'rounded-2xl border-2 px-5 py-2.5 text-base font-extrabold transition-all duration-200',
                  'focus:outline-none focus:ring-4 focus:ring-lilac-500/25 active:scale-[0.97]',
                  isActive
                    ? 'border-coral-500 bg-coral-500/10 text-coral-600 shadow-sm'
                    : 'border-cream-dark bg-white text-warm-700 hover:border-lilac-200',
                ].join(' ')}
                aria-pressed={isActive}
              >
                {s}
              </button>
            );
          })}

          {/* Botón "Otro…" */}
          <button
            type="button"
            onClick={handleOtroClick}
            className={[
              'rounded-2xl border-2 px-5 py-2.5 text-base font-extrabold transition-all duration-200',
              'focus:outline-none focus:ring-4 focus:ring-lilac-500/25 active:scale-[0.97]',
              otroActive
                ? 'border-lilac-400 bg-lilac-100/60 text-lilac-700 shadow-sm'
                : 'border-cream-dark bg-white text-warm-500 hover:border-lilac-200',
            ].join(' ')}
            aria-pressed={otroActive}
          >
            ✨ Otro…
          </button>
        </div>

        {/* Input inline para "Otro" */}
        {otroActive && (
          <div className="mt-3">
            <input
              type="text"
              value={otroValue}
              onChange={handleOtroInput}
              placeholder="Ej. D, G, Celeste, Pollitos…"
              className="input-warm max-w-xs"
              autoFocus
              maxLength={30}
            />
          </div>
        )}
      </div>

    </div>
  );
}
