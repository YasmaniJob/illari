import { useEffect, useRef, useState } from 'react';

interface ChatInputBarProps {
  onSend: (text: string) => void;
  onVoiceTranscript: (text: string) => void;
  disabled?: boolean;
  selectedStudent?: { id: string; name: string } | null;
  onClearStudent?: () => void;
}

/** Convierte un Blob de audio a base64 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const result = reader.result as string;
      // Quitar el prefijo "data:...;base64,"
      resolve(result.split(',')[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Elige el mejor mimeType compatible con el navegador */
function getSupportedMimeType(): string {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  for (const type of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(type)) {
      return type;
    }
  }
  return 'audio/webm';
}

export default function ChatInputBar({
  onSend,
  onVoiceTranscript,
  disabled = false,
  selectedStudent,
  onClearStudent,
}: ChatInputBarProps) {
  const [text, setText] = useState('');
  const [recording, setRecording] = useState(false);
  const [initializing, setInitializing] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const micSupported = typeof window !== 'undefined' && typeof navigator?.mediaDevices?.getUserMedia === 'function';

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      mediaRecorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
  }

  async function stopAndTranscribe() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    // Paramos la grabación; el evento 'onstop' se encargará de procesar el audio
    recorder.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  async function handleMic() {
    if (disabled || initializing) return;

    if (recording) {
      await stopAndTranscribe();
      return;
    }

    setVoiceError(null);
    setInitializing(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];

        if (blob.size < 1000) {
          return;
        }

        setTranscribing(true);
        try {
          const audioBase64 = await blobToBase64(blob);
          const res = await fetch('/api/guest/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audioBase64, mimeType }),
          });
          const data = (await res.json()) as { transcript?: string; error?: string };
          if (data.error) {
            setVoiceError(`Error al transcribir: ${data.error}`);
          } else if (data.transcript) {
            setText((prev) => (prev ? `${prev} ${data.transcript!.trim()}` : data.transcript!.trim()));
          }
        } catch {
          setVoiceError('No se pudo transcribir el audio. Intenta de nuevo.');
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start();
      setRecording(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('Permission') || msg.includes('permission') || msg.includes('NotAllowed')) {
        setVoiceError('Permiso de micrófono denegado. Habilítalo en el navegador.');
      } else if (msg.includes('NotFound') || msg.includes('Requested device not found')) {
        setVoiceError('No se detectó micrófono. Verifica que esté conectado.');
      } else {
        setVoiceError('No se pudo acceder al micrófono.');
      }
    } finally {
      setInitializing(false);
    }
  }

  const isProcessing = transcribing;
  const placeholder = initializing
    ? 'Preparando micrófono…'
    : recording
    ? 'Grabando… pulsa el botón para terminar'
    : transcribing
    ? 'Transcribiendo…'
    : selectedStudent
    ? `¿Qué observas en ${selectedStudent.name}?`
    : '¿Qué estás viendo en el aula?';

  return (
    <div className="shrink-0 px-4 pb-4 pt-2 md:px-6 md:pb-5">
      {/* ── Indicador pedagógico de seguimiento ── */}
      <div className="mx-auto max-w-2xl md:max-w-none mb-3 flex items-center gap-2">
        {selectedStudent ? (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-lilac-50 border border-lilac-200 px-3 py-1.5 text-xs font-extrabold text-lilac-800 transition-all duration-200 animate-fade-in shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-lilac-500 shrink-0" aria-hidden />
            Observando a: <span className="text-lilac-600 font-extrabold">{selectedStudent.name}</span>
            {onClearStudent && (
              <button
                type="button"
                onClick={onClearStudent}
                aria-label="Volver a observación grupal"
                className="ml-1 flex h-4 w-4 items-center justify-center rounded-full text-lilac-400 hover:bg-lilac-200/50 hover:text-lilac-700 transition-colors"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-honey-50 border border-honey-200 px-3 py-1.5 text-xs font-extrabold text-honey-850 shadow-sm">
            <span className="text-sm animate-pulse" aria-hidden>🏫</span>
            Observación general del grupo
          </span>
        )}
      </div>

      {voiceError && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-warm-900/40 backdrop-blur-sm" onClick={() => setVoiceError(null)} />
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl ring-1 ring-warm-900/5 animate-scale-up">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-coral-50 text-coral-500">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-extrabold text-warm-900">
                Aviso del micrófono
              </h3>
            </div>
            <p className="text-base font-medium text-warm-700 leading-relaxed mb-6">
              {voiceError.replace('Error al transcribir: ', '')}
            </p>
            <button
              type="button"
              className="w-full rounded-2xl bg-warm-900 py-3.5 px-4 text-center text-sm font-extrabold text-white transition-all hover:bg-warm-800 focus-ring-warm"
              onClick={() => setVoiceError(null)}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mx-auto max-w-2xl md:max-w-none flex items-center gap-3 rounded-3xl border-2 border-cream-dark bg-white/90 backdrop-blur-md px-4 py-3 shadow-[0_8px_32px_-8px_rgba(61,44,41,0.2)] md:bg-white md:rounded-2xl">
          {micSupported && (
            <div className="relative shrink-0">
              {/* Anillos de onda cuando graba */}
              {recording && (
                <>
                  <span className="absolute inset-0 rounded-2xl bg-red-400 opacity-40 animate-ping" />
                  <span
                    className="absolute inset-0 rounded-2xl bg-red-300 opacity-20"
                    style={{ animation: 'ping 1.5s cubic-bezier(0,0,0.2,1) infinite 0.5s' }}
                  />
                </>
              )}
              <button
                type="button"
                onClick={handleMic}
                disabled={disabled || transcribing}
                aria-label={recording ? 'Detener grabación' : 'Grabar observación'}
                className={[
                  'relative flex h-14 w-14 items-center justify-center rounded-2xl transition-all duration-200 focus-ring-warm z-10',
                  recording
                    ? 'bg-red-500 text-white scale-110 shadow-[0_0_20px_rgba(239,68,68,0.5)] animate-pulse'
                    : initializing || transcribing
                    ? 'bg-lilac-200 text-lilac-400 cursor-wait'
                    : 'bg-lilac-100 text-lilac-600 hover:bg-lilac-500 hover:text-white',
                ].join(' ')}
              >
                {initializing || transcribing ? (
                  /* Spinner mientras transcribe o inicializa */
                  <svg className="h-6 w-6 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                ) : (
                  <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                )}
              </button>
            </div>
          )}

          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            disabled={disabled || isProcessing}
            placeholder={placeholder}
            className="flex-1 min-w-0 bg-transparent border-0 text-lg font-semibold text-warm-900 placeholder:text-warm-500/60 placeholder:italic focus:outline-none focus:ring-0 py-3"
          />

          <button
            type="submit"
            disabled={disabled || !text.trim() || isProcessing}
            aria-label="Guardar observación"
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-coral-500 text-white transition-all duration-200 hover:bg-coral-600 disabled:opacity-40 disabled:cursor-not-allowed focus-ring-warm shadow-[0_4px_12px_-2px_rgba(224,122,95,0.4)]"
          >
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
}
