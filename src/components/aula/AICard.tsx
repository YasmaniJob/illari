import { memo, useEffect, useRef, useState } from 'react';

export interface AIMessage {
  id: string;
  type: 'ai';
  cai: {
    contexto: string;
    accion: string;
    interpretacion: string;
    interpretacionSugerida: string;
    intervencion: string;
    retroalimentacion: string;
  };
  studentName?: string;
  timestamp: string;
}

interface AICardProps {
  message: AIMessage;
  onUpdate: (
    id: string,
    field: 'contexto' | 'accion' | 'interpretacion' | 'retroalimentacion' | 'intervencion' | 'interpretacionSugerida',
    value: string,
  ) => void;
}

function AutoResizeTextarea({ value, onChange, className, placeholder }: any) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return <textarea ref={ref} value={value} onChange={onChange} rows={1} placeholder={placeholder} className={`overflow-hidden ${className}`} />;
}

// ─── Sección individual C / A / I ─────────────────────────────────────────────

interface CAISectionProps {
  tag: string;
  tagColor: string;
  tagBg: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

function CAISection({ tag, tagColor, tagBg, label, value, onChange, placeholder }: CAISectionProps) {
  return (
    <div className="flex gap-3">
      {/* Tag lateral */}
      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
        <span
          className="flex h-6 w-6 items-center justify-center rounded-lg text-[10px] font-extrabold"
          style={{ background: tagBg, color: tagColor }}
        >
          {tag}
        </span>
        <div className="flex-1 w-px" style={{ background: tagBg }} />
      </div>
      {/* Contenido */}
      <div className="flex-1 min-w-0 pb-3">
        <p className="text-[10px] font-extrabold uppercase tracking-widest mb-1" style={{ color: tagColor }}>
          {label}
        </p>
        <AutoResizeTextarea
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full resize-none bg-transparent border border-transparent hover:border-cream-dark focus:bg-white rounded-xl px-3 py-2 -mx-3 text-sm text-warm-800 leading-relaxed transition-all duration-200 placeholder:text-warm-400 placeholder:italic"
        />
      </div>
    </div>
  );
}

function AICard({ message, onUpdate }: AICardProps) {
  const [expanded, setExpanded] = useState(true);
  const { cai } = message;

  return (
    <article className="overflow-hidden rounded-3xl border-2 border-lilac-100 bg-white shadow-[0_2px_12px_-4px_rgba(139,92,246,0.12)]">
      {/* Header */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 bg-gradient-to-r from-lilac-50 to-white hover:from-lilac-100/60 transition-colors duration-200 rounded-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-lilac-600 text-sm font-extrabold text-white">
            ✦
          </span>
          <div className="min-w-0 text-left">
            <span className="text-sm font-extrabold text-warm-900">Evidencia pedagógica</span>
            {message.studentName && (
              <span className="ml-2 text-xs font-bold text-lilac-600 capitalize">· {message.studentName}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <time className="text-xs font-semibold text-warm-400">{message.timestamp}</time>
          <svg
            className={`h-4 w-4 text-warm-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Body C+A+I */}
      {expanded && (
        <div className="px-5 pt-4 pb-2">
          <CAISection
            tag="C"
            tagColor="#0369a1"
            tagBg="#e0f2fe"
            label="Contexto"
            value={cai.contexto}
            onChange={(v) => onUpdate(message.id, 'contexto', v)}
          />
          <CAISection
            tag="A"
            tagColor="#065f46"
            tagBg="#d1fae5"
            label="Acción del niño/a"
            value={cai.accion}
            onChange={(v) => onUpdate(message.id, 'accion', v)}
          />
          <CAISection
            tag="INT"
            tagColor="#0f766e"
            tagBg="#ccfbf1"
            label="Intervención del docente"
            value={cai.intervencion}
            placeholder="Sin intervención del docente durante esta situación."
            onChange={(v) => onUpdate(message.id, 'intervencion', v)}
          />
          <CAISection
            tag="IPS"
            tagColor="#b45309"
            tagBg="#fef3c7"
            label="Interpretación pedagógica sugerida"
            value={cai.interpretacionSugerida}
            onChange={(v) => onUpdate(message.id, 'interpretacionSugerida', v)}
          />
          <CAISection
            tag="I"
            tagColor="#5b21b6"
            tagBg="#ede9fe"
            label="Interpretación curricular"
            value={cai.interpretacion}
            onChange={(v) => onUpdate(message.id, 'interpretacion', v)}
          />
          {/* Retroalimentación */}
          <div className="border-t border-cream-dark pt-3 pb-1 mt-1">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-coral-500 mb-1">
              💡 Para la próxima sesión
            </p>
            <AutoResizeTextarea
              value={cai.retroalimentacion}
              onChange={(e: any) => onUpdate(message.id, 'retroalimentacion', e.target.value)}
              className="w-full resize-none bg-transparent border border-transparent hover:border-cream-dark focus:bg-white rounded-xl px-3 py-2 -mx-3 text-sm text-warm-700 italic leading-relaxed transition-all duration-200"
            />
          </div>
        </div>
      )}
    </article>
  );
}

export default memo(AICard);
