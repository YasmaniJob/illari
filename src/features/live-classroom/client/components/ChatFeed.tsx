import { memo, useEffect, useMemo, useRef } from 'react';
import AICard, { type AIMessage } from '@/features/live-classroom/client/components/AICard';

export interface UserMessage {
  id: string;
  type: 'user';
  text: string;
  studentName?: string;
  timestamp: string;
}

export type ChatMessage = UserMessage | AIMessage;

interface ChatFeedProps {
  messages: ChatMessage[];
  sending?: boolean;
  /** Cuando está definido, filtra el feed para mostrar solo las observaciones de este estudiante */
  filterStudentName?: string;
  onUpdateAI: (
    id: string,
    field: 'contexto' | 'accion' | 'interpretacion' | 'retroalimentacion' | 'intervencion' | 'interpretacionSugerida',
    value: string,
  ) => void;
}

/** Auto-resizing textarea to prevent scrollbars within clinical fields */
function AutoResizeTextarea({ value, onChange, className, placeholder }: any) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (ref.current) {
      ref.current.style.height = 'auto';
      ref.current.style.height = `${ref.current.scrollHeight}px`;
    }
  }, [value]);

  return (
    <textarea
      ref={ref}
      value={value}
      onChange={onChange}
      rows={1}
      placeholder={placeholder}
      className={`overflow-hidden resize-none bg-transparent border border-transparent hover:border-cream-dark focus:bg-white rounded-xl px-3 py-2 -mx-3 text-sm text-warm-850 leading-relaxed transition-all duration-200 focus:outline-none focus:ring-1 focus:ring-lilac-200 ${className}`}
    />
  );
}

// ─── Sub-sección clínica del expediente ──────────────────────────────────────────

interface ExpedienteSectionProps {
  tag: string;
  tagColor: string;
  tagBg: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}

function ExpedienteSection({ tag, tagColor, tagBg, label, value, onChange, placeholder }: ExpedienteSectionProps) {
  return (
    <div className="flex gap-3">
      {/* Indicador clínico lateral */}
      <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
        <span
          className="flex h-5 w-5 items-center justify-center rounded-lg text-[9px] font-extrabold shadow-sm"
          style={{ background: tagBg, color: tagColor }}
        >
          {tag}
        </span>
        <div className="flex-1 w-px bg-gray-100" />
      </div>
      {/* Contenido editable */}
      <div className="flex-1 min-w-0 pb-3">
        <p className="text-[9px] font-extrabold uppercase tracking-wider mb-0.5" style={{ color: tagColor }}>
          {label}
        </p>
        <AutoResizeTextarea
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full"
        />
      </div>
    </div>
  );
}

// ─── Tarjeta unificada de expediente ─────────────────────────────────────────────

interface ExpedienteCardProps {
  entry: {
    id: string;
    timestamp: string;
    userMsg: UserMessage;
    aiMsg?: AIMessage;
  };
  onUpdateAI: ChatFeedProps['onUpdateAI'];
}

function ExpedienteCard({ entry, onUpdateAI }: ExpedienteCardProps) {
  const { userMsg, aiMsg, timestamp } = entry;

  return (
    <div className="overflow-hidden rounded-3xl border-2 border-warm-200 bg-white shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Cabecera del expediente */}
      <div className="flex items-center justify-between border-b border-warm-100 bg-warm-50/50 px-5 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm">📝</span>
          <span className="text-xs font-extrabold text-warm-700 tracking-wider uppercase">Ficha de Observación</span>
        </div>
        <time className="text-xs font-bold text-warm-400">{timestamp}</time>
      </div>

      <div className="p-5 space-y-4">
        {/* 1. Situación Observada */}
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-widest text-coral-500 mb-1.5">
            1. Situación Observada
          </p>
          <div className="rounded-2xl bg-cream/35 border border-cream-dark/30 px-4 py-3 text-base text-warm-850 font-semibold leading-relaxed">
            {userMsg.text}
          </div>
        </div>

        {/* 2. Análisis Pedagógico (solo si existe el mensaje de IA) */}
        {aiMsg ? (
          <div className="pt-3 border-t border-warm-100">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-lilac-600 mb-3">
              2. Análisis Pedagógico
            </p>
            <div className="space-y-1">
              <ExpedienteSection
                tag="C"
                tagColor="#0369a1"
                tagBg="#e0f2fe"
                label="Contexto"
                value={aiMsg.cai.contexto}
                onChange={(v) => onUpdateAI(aiMsg.id, 'contexto', v)}
              />
              <ExpedienteSection
                tag="A"
                tagColor="#065f46"
                tagBg="#d1fae5"
                label="Acción del niño/a"
                value={aiMsg.cai.accion}
                onChange={(v) => onUpdateAI(aiMsg.id, 'accion', v)}
              />
              <ExpedienteSection
                tag="INT"
                tagColor="#0f766e"
                tagBg="#ccfbf1"
                label="Intervención del docente"
                value={aiMsg.cai.intervencion}
                placeholder="Sin intervención del docente durante esta situación."
                onChange={(v) => onUpdateAI(aiMsg.id, 'intervencion', v)}
              />
              <ExpedienteSection
                tag="IPS"
                tagColor="#b45309"
                tagBg="#fef3c7"
                label="Interpretación pedagógica sugerida"
                value={aiMsg.cai.interpretacionSugerida}
                onChange={(v) => onUpdateAI(aiMsg.id, 'interpretacionSugerida', v)}
              />
              <ExpedienteSection
                tag="I"
                tagColor="#5b21b6"
                tagBg="#ede9fe"
                label="Interpretación curricular"
                value={aiMsg.cai.interpretacion}
                onChange={(v) => onUpdateAI(aiMsg.id, 'interpretacion', v)}
              />
            </div>

            {/* Retroalimentación */}
            <div className="border-t border-warm-100 pt-3 mt-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-coral-500 mb-1">
                💡 Recomendación / Retroalimentación
              </p>
              <AutoResizeTextarea
                value={aiMsg.cai.retroalimentacion}
                onChange={(e: any) => onUpdateAI(aiMsg.id, 'retroalimentacion', e.target.value)}
                placeholder="Escribe sugerencias o próximos pasos..."
                className="w-full text-warm-700 italic"
              />
            </div>
          </div>
        ) : (
          /* Cargando análisis */
          <div className="flex items-center gap-2.5 py-4 text-lilac-500">
            <div className="h-4 w-4 border-2 border-lilac-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-bold tracking-wider uppercase">Sistematizando análisis clínico...</span>
          </div>
        )}
      </div>
    </div>
  );
}

/** Three-dot bouncing animation shown while the AI is thinking */
function TypingBubble() {
  return (
    <div className="flex items-end gap-3 max-w-sm" aria-live="polite" aria-label="Procesando observación…">
      {/* Avatar */}
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lilac-600 text-base font-extrabold text-white select-none">
        ✨
      </span>

      {/* Bubble */}
      <div className="flex items-center gap-1.5 rounded-3xl rounded-bl-lg bg-white border border-lilac-100 px-5 py-4 shadow-sm">
        <span
          className="h-2.5 w-2.5 rounded-full bg-lilac-400"
          style={{ animation: 'miwawita-bounce 1.2s ease-in-out infinite', animationDelay: '0ms' }}
        />
        <span
          className="h-2.5 w-2.5 rounded-full bg-lilac-400"
          style={{ animation: 'miwawita-bounce 1.2s ease-in-out infinite', animationDelay: '200ms' }}
        />
        <span
          className="h-2.5 w-2.5 rounded-full bg-lilac-400"
          style={{ animation: 'miwawita-bounce 1.2s ease-in-out infinite', animationDelay: '400ms' }}
        />
      </div>

      <p className="text-sm font-semibold text-warm-500 pb-1">Sistematizando la observación…</p>

      {/* Keyframe injected inline so it works without a global CSS change */}
      <style>{`
        @keyframes miwawita-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30%            { transform: translateY(-7px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

function ChatFeed({ messages, sending = false, filterStudentName, onUpdateAI }: ChatFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Cuando hay un estudiante en foco, agrupar observaciones (user) y análisis (ai) estilo historial clínico
  const expedienteEntries = useMemo(() => {
    if (!filterStudentName) return [];

    const studentMsgs = messages.filter((m) => m.studentName === filterStudentName);
    const entries: Array<{
      id: string;
      timestamp: string;
      userMsg: UserMessage;
      aiMsg?: AIMessage;
    }> = [];

    for (let i = 0; i < studentMsgs.length; i++) {
      const msg = studentMsgs[i];
      if (msg.type === 'user') {
        const nextMsg = studentMsgs[i + 1];
        if (nextMsg && nextMsg.type === 'ai') {
          entries.push({
            id: `${msg.id}-${nextMsg.id}`,
            timestamp: msg.timestamp,
            userMsg: msg,
            aiMsg: nextMsg,
          });
          i++; // Saltamos el mensaje AI ya agrupado
        } else {
          entries.push({
            id: msg.id,
            timestamp: msg.timestamp,
            userMsg: msg,
          });
        }
      } else if (msg.type === 'ai') {
        // AI huérfana
        entries.push({
          id: msg.id,
          timestamp: msg.timestamp,
          userMsg: {
            id: `sys-user-${msg.id}`,
            type: 'user',
            text: 'Observación del expediente pedagógico.',
            studentName: filterStudentName,
            timestamp: msg.timestamp,
          },
          aiMsg: msg,
        });
      }
    }
    return entries;
  }, [messages, filterStudentName]);

  // Scroll to bottom on new messages AND when the typing bubble appears/disappears
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, sending]);

  const avatarColors = ['bg-coral-500', 'bg-lilac-500', 'bg-sky-300', 'bg-honey-400', 'bg-mint-400'];

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-6 md:px-8 bg-cream/40">
      {/* Cabecera de estudiante en foco */}
      {filterStudentName && (
        <div className="flex items-center justify-between gap-3 px-1 pb-3 mb-2 border-b border-warm-200">
          <div className="flex items-center gap-3">
            <span
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-base font-extrabold text-white select-none shadow-sm ${avatarColors[filterStudentName.charCodeAt(0) % avatarColors.length]}`}
            >
              {filterStudentName.charAt(0).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="text-base font-extrabold text-warm-900 capitalize leading-tight">{filterStudentName}</p>
              <p className="text-[11px] font-bold text-lilac-600 uppercase tracking-widest mt-0.5">
                Expediente de Observaciones
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1.5 text-[10px] font-extrabold text-lilac-700 bg-lilac-100 px-3 py-1 rounded-xl shrink-0 shadow-sm border border-lilac-200/50">
            <span className="h-1.5 w-1.5 rounded-full bg-lilac-500 animate-pulse" />
            En foco
          </span>
        </div>
      )}

      {/* Vista de expediente (filtrado por estudiante) o vista chat tradicional */}
      {filterStudentName ? (
        /* ─── Modo Expediente Clínico/Pedagógico ─── */
        <div className="space-y-6">
          {expedienteEntries.length === 0 && !sending && (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
              <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-lilac-100 text-3xl mb-4 shadow-sm border border-lilac-200/30 animate-pulse">
                📋
              </span>
              <p className="text-lg font-extrabold text-warm-900 capitalize">{filterStudentName}</p>
              <p className="mt-2 text-sm font-semibold text-warm-600 max-w-xs leading-relaxed">
                Aún no hay registros en la ficha de seguimiento clínico-pedagógico de este estudiante.
              </p>
            </div>
          )}

          {expedienteEntries.map((entry) => (
            <ExpedienteCard key={entry.id} entry={entry} onUpdateAI={onUpdateAI} />
          ))}
        </div>
      ) : (
        /* ─── Modo Chat Tradicional (Aula General) ─── */
        <div className="space-y-6">
          {messages.length === 0 && !sending && (
            <div className="h-full flex flex-col items-center justify-center text-center px-6 py-12">
              <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-honey-200 text-3xl mb-4">
                🌼
              </span>
              <p className="text-lg font-extrabold text-warm-900">Tu línea de observaciones</p>
              <p className="mt-2 text-base text-warm-600 max-w-xs leading-relaxed">
                Escribe lo que observas. La IA organiza la evidencia por ti.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => {
            if (msg.type === 'user') {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[90%] sm:max-w-lg">
                    <div className="rounded-3xl rounded-br-lg bg-gradient-to-br from-coral-500 to-coral-600 px-8 py-4 text-lg font-semibold text-white shadow-[0_4px_16px_-4px_rgba(224,122,95,0.4)] leading-relaxed">
                      {msg.text}
                    </div>
                    <div className="mt-2 text-sm font-semibold text-warm-500 text-right flex items-center justify-end gap-2">
                      <time>{msg.timestamp}</time>
                      {msg.studentName && <span>•</span>}
                      {msg.studentName && <span className="text-warm-700">{msg.studentName}</span>}
                    </div>
                  </div>
                </div>
              );
            }

            let inferredStudentName = msg.studentName;
            if (!inferredStudentName) {
              for (let i = idx - 1; i >= 0; i--) {
                const prev = messages[i];
                if (prev.type === 'user') {
                  inferredStudentName = prev.studentName;
                  break;
                }
              }
            }

            return (
              <div key={msg.id} className="max-w-full">
                <AICard message={{ ...msg, studentName: inferredStudentName }} onUpdate={onUpdateAI} />
              </div>
            );
          })}
        </div>
      )}

      {/* Typing indicator — visible only while AI is processing */}
      {sending && <TypingBubble />}

      {/* Invisible anchor scrolled into view on updates */}
      <div ref={bottomRef} className="h-1" aria-hidden />
    </div>
  );
}

export default memo(ChatFeed);
