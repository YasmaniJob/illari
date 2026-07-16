import { useState } from 'react';

interface ChatInputBarProps {
  onSend: (text: string) => void;
  /** Reservado para futura implementación de entrada por voz */
  onVoiceTranscript?: (text: string) => void;
  disabled?: boolean;
  selectedStudent?: { id: string; name: string } | null;
  onClearStudent?: () => void;
  onOpenPicker?: () => void;
}

export default function ChatInputBar({
  onSend,
  disabled = false,
  selectedStudent,
  onClearStudent,
  onOpenPicker,
}: ChatInputBarProps) {
  const [text, setText] = useState('');

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  }

  const placeholder = selectedStudent ? `¿Qué observas en ${selectedStudent.name}?` : '¿Qué estás viendo en el aula?';

  return (
    <div className="shrink-0 px-3 sm:px-4 pb-3 sm:pb-4 pt-2 md:px-6 md:pb-5">
      {/* Selector de estudiante */}
      <div className="mx-auto max-w-2xl md:max-w-none mb-2 flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenPicker}
          className={[
            'inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all duration-200 shadow-sm',
            'focus:outline-none active:scale-[0.97]',
            selectedStudent
              ? 'bg-lilac-50 border border-lilac-200 text-lilac-800 hover:bg-lilac-100'
              : 'bg-honey-50 border border-honey-200 text-warm-700 hover:bg-honey-100',
          ].join(' ')}
          aria-label="Cambiar estudiante seleccionado"
        >
          {selectedStudent ? (
            <>
              <span className="h-1.5 w-1.5 rounded-full bg-lilac-500 shrink-0" aria-hidden />
              Observando a: <span className="text-lilac-600 font-extrabold">{selectedStudent.name}</span>
            </>
          ) : (
            <>
              <span className="text-sm" aria-hidden>
                🏫
              </span>
              Aula General
            </>
          )}
          <svg
            className="h-3.5 w-3.5 opacity-50 ml-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {selectedStudent && onClearStudent && (
          <button
            type="button"
            onClick={onClearStudent}
            aria-label="Volver a observación grupal"
            className="flex h-6 w-6 items-center justify-center rounded-full text-warm-400 hover:bg-cream hover:text-warm-700 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit}>
        <div className="mx-auto max-w-2xl md:max-w-none flex items-center gap-2 rounded-2xl border-2 border-cream-dark bg-white px-4 py-2 shadow-[0_4px_16px_-4px_rgba(61,44,41,0.12)] transition-all duration-200">
          {/* Ícono decorativo — ancla visual izquierda */}
          <svg
            className="h-5 w-5 shrink-0 text-warm-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled}
            placeholder={placeholder}
            className="flex-1 min-w-0 bg-transparent border-0 text-base font-semibold text-warm-900 placeholder:text-warm-400 focus:outline-none py-2"
            autoComplete="off"
          />
          <button
            type="submit"
            disabled={disabled || !text.trim()}
            aria-label="Guardar observación"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-coral-500 text-white transition-all duration-200 hover:bg-coral-600 disabled:opacity-35 disabled:cursor-not-allowed focus-ring-warm shadow-[0_2px_8px_-2px_rgba(224,122,95,0.4)]"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
