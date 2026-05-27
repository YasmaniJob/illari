import { memo, useEffect, useRef, useState } from 'react';

export interface AIMessage {
  id: string;
  type: 'ai';
  evidencia: string;
  retroalimentacion: string;
  studentName?: string;
  timestamp: string;
}

interface AICardProps {
  message: AIMessage;
  onUpdate: (id: string, field: 'evidencia' | 'retroalimentacion', value: string) => void;
}

function AutoResizeTextarea({ value, onChange, className }: any) {
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
      className={`overflow-hidden ${className}`}
    />
  );
}

function AICard({ message, onUpdate }: AICardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <article className="card-warm overflow-hidden border-lilac-100">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 border-b-2 border-lilac-100 bg-gradient-to-r from-lilac-100/80 to-cream transition-colors duration-200 hover:from-lilac-100 focus-ring-warm rounded-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-lilac-600 text-base font-extrabold text-white">
            ✨
          </span>
          <div className="min-w-0 text-left flex items-center gap-2">
            <span className="text-base font-extrabold text-warm-900 leading-tight">
              Apoyo pedagógico
            </span>
            {message.studentName && (
              <>
                <span className="text-lilac-400 font-bold">•</span>
                <span className="text-sm font-extrabold text-lilac-700 truncate capitalize">
                  {message.studentName}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <time className="text-sm font-semibold text-warm-500">{message.timestamp}</time>
          <span
            className={[
              'text-warm-500 transition-transform duration-200',
              expanded ? 'rotate-180' : '',
            ].join(' ')}
            aria-hidden
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </span>
        </div>
      </button>

      {expanded && (
        <div className="p-4 sm:p-5 space-y-4">
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-base font-extrabold text-warm-900">
              <span className="text-xl" aria-hidden>
                📝
              </span>
              Lo que observé
            </label>
            <AutoResizeTextarea
              value={message.evidencia}
              onChange={(e: any) => onUpdate(message.id, 'evidencia', e.target.value)}
              className="w-full resize-none bg-transparent border border-transparent hover:border-cream-dark focus:border-lilac-300 focus:bg-white focus:ring-4 focus:ring-lilac-500/10 rounded-xl px-3 py-2 -mx-3 text-warm-800 leading-relaxed transition-all duration-200"
            />
          </div>
          <div>
            <label className="mb-1.5 flex items-center gap-2 text-base font-extrabold text-warm-900">
              <span className="text-xl" aria-hidden>
                💡
              </span>
              Ideas para acompañar
            </label>
            <AutoResizeTextarea
              value={message.retroalimentacion}
              onChange={(e: any) => onUpdate(message.id, 'retroalimentacion', e.target.value)}
              className="w-full resize-none bg-transparent border border-transparent hover:border-cream-dark focus:border-lilac-300 focus:bg-white focus:ring-4 focus:ring-lilac-500/10 rounded-xl px-3 py-2 -mx-3 text-warm-800 leading-relaxed transition-all duration-200"
            />
          </div>
        </div>
      )}
    </article>
  );
}

export default memo(AICard);
