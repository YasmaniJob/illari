import { memo, useEffect, useRef } from 'react';
import AICard, { type AIMessage } from './AICard';

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
  onUpdateAI: (id: string, field: 'contexto' | 'accion' | 'interpretacion' | 'retroalimentacion', value: string) => void;
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

function ChatFeed({ messages, sending = false, onUpdateAI }: ChatFeedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages AND when the typing bubble appears/disappears
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, sending]);

  return (
    <div ref={containerRef} className="flex-1 overflow-y-auto px-5 py-6 space-y-6 md:px-8">
      {messages.length === 0 && !sending && (
        <div className="h-full flex flex-col items-center justify-center text-center px-6">
          <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-honey-200 text-3xl mb-4">🌼</span>
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

        // Para tarjetas de IA: si no tienen studentName, lo inferimos
        // buscando hacia atrás el mensaje de usuario más cercano
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
            <AICard
              message={{ ...msg, studentName: inferredStudentName }}
              onUpdate={onUpdateAI}
            />
          </div>
        );
      })}

      {/* Typing indicator — visible only while AI is processing */}
      {sending && <TypingBubble />}

      {/* Invisible anchor scrolled into view on updates */}
      <div ref={bottomRef} className="h-1" aria-hidden />
    </div>
  );
}

export default memo(ChatFeed);
