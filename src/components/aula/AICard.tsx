import { useState } from 'react';

export interface AIMessage {
  id: string;
  type: 'ai';
  evidencia: string;
  retroalimentacion: string;
  timestamp: string;
}

interface AICardProps {
  message: AIMessage;
  onUpdate: (id: string, field: 'evidencia' | 'retroalimentacion', value: string) => void;
}

export default function AICard({ message, onUpdate }: AICardProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <article className="card-warm overflow-hidden border-lilac-100">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="flex w-full items-center justify-between gap-3 px-5 py-5 border-b-2 border-lilac-100 bg-gradient-to-r from-lilac-100/80 to-cream transition-colors duration-200 hover:from-lilac-100 focus-ring-warm rounded-none"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-lilac-600 text-lg font-extrabold text-white">
            ✨
          </span>
          <span className="text-xl font-extrabold text-warm-900 text-left">Apoyo pedagógico</span>
        </div>
        <time className="text-base font-semibold text-warm-500 shrink-0">{message.timestamp}</time>
      </button>

      {expanded && (
        <div className="p-5 sm:p-6 space-y-6">
          <div>
            <label className="mb-2 flex items-center gap-2 text-lg font-extrabold text-warm-900">
              <span className="text-2xl" aria-hidden>
                📝
              </span>
              Lo que observé
            </label>
            <textarea
              value={message.evidencia}
              onChange={(e) => onUpdate(message.id, 'evidencia', e.target.value)}
              rows={4}
              className="input-warm resize-none bg-honey-200/20"
            />
          </div>
          <div>
            <label className="mb-2 flex items-center gap-2 text-lg font-extrabold text-warm-900">
              <span className="text-2xl" aria-hidden>
                💡
              </span>
              Ideas para acompañar
            </label>
            <textarea
              value={message.retroalimentacion}
              onChange={(e) => onUpdate(message.id, 'retroalimentacion', e.target.value)}
              rows={4}
              className="input-warm resize-none"
            />
          </div>
        </div>
      )}
    </article>
  );
}
