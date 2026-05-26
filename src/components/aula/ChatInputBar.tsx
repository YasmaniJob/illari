import { useRef, useState } from 'react';

interface ChatInputBarProps {
  onSend: (text: string) => void;
  onVoiceTranscript: (text: string) => void;
  disabled?: boolean;
}

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: { results: { [index: number]: { [index: number]: { transcript: string } } } }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

function getSpeechRecognition(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const w = window as Window & {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function ChatInputBar({
  onSend,
  onVoiceTranscript,
  disabled = false,
}: ChatInputBarProps) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  }

  function stopRecording() {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setRecording(false);
  }

  function handleMic() {
    if (disabled) return;

    if (recording) {
      stopRecording();
      return;
    }

    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setVoiceError('Tu navegador no soporta dictado por voz. Escribe la observación.');
      return;
    }

    setVoiceError(null);
    const recognition = new SpeechRecognition();
    recognition.lang = 'es-PE';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) onVoiceTranscript(transcript);
    };

    recognition.onerror = () => {
      setVoiceError('No se pudo captar la voz. Intenta de nuevo.');
      stopRecording();
    };

    recognition.onend = () => {
      setRecording(false);
      recognitionRef.current = null;
    };

    setRecording(true);
    recognition.start();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="fixed bottom-5 left-5 right-5 z-50 md:static md:bottom-auto md:left-auto md:right-auto md:z-auto md:px-8 md:pb-6 md:pt-3"
    >
      {voiceError && (
        <p className="mx-auto max-w-2xl mb-2 text-sm font-semibold text-coral-600 text-center md:text-left">
          {voiceError}
        </p>
      )}
      <div className="mx-auto max-w-2xl md:max-w-none flex items-center gap-3 rounded-3xl border-2 border-cream-dark bg-white/90 backdrop-blur-md px-4 py-3 shadow-[0_8px_32px_-8px_rgba(61,44,41,0.2)] md:bg-white md:rounded-2xl">
        <button
          type="button"
          onClick={handleMic}
          disabled={disabled}
          aria-label={recording ? 'Detener dictado' : 'Dictar observación'}
          className={[
            'flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl transition-all duration-200 focus-ring-warm',
            recording
              ? 'bg-red-500 text-white animate-pulse'
              : 'bg-lilac-100 text-lilac-600 hover:bg-lilac-500 hover:text-white',
          ].join(' ')}
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          placeholder="¿Qué estás viendo en el aula?"
          className="flex-1 min-w-0 bg-transparent border-0 text-lg font-semibold text-warm-900 placeholder:text-warm-500/80 focus:outline-none focus:ring-0 py-3"
        />

        <button
          type="submit"
          disabled={disabled || !text.trim()}
          aria-label="Guardar observación"
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-coral-500 text-white transition-all duration-200 hover:bg-coral-600 disabled:opacity-40 disabled:cursor-not-allowed focus-ring-warm shadow-[0_4px_12px_-2px_rgba(224,122,95,0.4)]"
        >
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </form>
  );
}
