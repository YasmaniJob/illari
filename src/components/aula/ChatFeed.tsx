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
  onUpdateAI: (id: string, field: 'evidencia' | 'retroalimentacion', value: string) => void;
}

export default function ChatFeed({ messages, onUpdateAI }: ChatFeedProps) {
  return (
    <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6 md:px-8">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <span className="flex h-20 w-20 items-center justify-center rounded-3xl bg-honey-200 text-4xl mb-6">🌼</span>
          <p className="text-2xl font-extrabold text-warm-900">Tu línea de observaciones</p>
          <p className="mt-3 text-xl text-warm-700 max-w-md leading-relaxed">
            Escribe o graba lo que ves en el aula. Te ayudamos a organizar la evidencia.
          </p>
        </div>
      )}

      {messages.map((msg) =>
        msg.type === 'user' ? (
          <div key={msg.id} className="flex justify-end">
            <div className="max-w-[90%] sm:max-w-lg">
              {msg.studentName && (
                <p className="text-base font-bold text-warm-700 mb-2 text-right">Sobre {msg.studentName}</p>
              )}
              <div className="rounded-3xl rounded-br-lg bg-gradient-to-br from-coral-500 to-coral-600 px-6 py-4 text-lg font-semibold text-white shadow-[0_4px_16px_-4px_rgba(224,122,95,0.4)] leading-relaxed">
                {msg.text}
              </div>
              <time className="mt-2 block text-base font-semibold text-warm-500 text-right">{msg.timestamp}</time>
            </div>
          </div>
        ) : (
          <div key={msg.id} className="max-w-full">
            <AICard message={msg} onUpdate={onUpdateAI} />
          </div>
        ),
      )}
    </div>
  );
}
