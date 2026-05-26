import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchActiveSession,
  fetchObservations,
  fetchStudents,
  patchObservation,
  postEvidence,
  type StudentDto,
} from '../../lib/api/client';
import type { SessionConfig } from '../../lib/curriculum';
import ChatFeed, { type ChatMessage } from './ChatFeed';
import ChatInputBar from './ChatInputBar';
import StudentList from './StudentList';

export default function LiveClassroom() {
  const [session, setSession] = useState<SessionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      try {
        const active = await fetchActiveSession();
        setSession(active);
        if (active?.grado && active?.seccion) {
          const [msgs, studs] = await Promise.all([
            fetchObservations(active.id),
            fetchStudents(active.grado, active.seccion),
          ]);
          setMessages(msgs);
          setStudents(studs);
          setSelectedStudentId(studs[0]?.id ?? null);
        } else if (active) {
          const msgs = await fetchObservations(active.id);
          setMessages(msgs);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error al cargar la sesión');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);

  const handleSend = useCallback(
    async (text: string) => {
      if (!session) return;
      setSending(true);
      setError(null);
      try {
        const { userMessage, aiMessage } = await postEvidence({
          sessionId: session.id,
          session,
          text,
          studentName: selectedStudent?.name,
          source: 'text',
        });
        setMessages((prev) => [...prev, userMessage, aiMessage]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo registrar');
      } finally {
        setSending(false);
      }
    },
    [session, selectedStudent],
  );

  const handleVoiceTranscript = useCallback(
    async (transcript: string) => {
      if (!session || !transcript.trim()) return;
      setSending(true);
      setError(null);
      try {
        const { userMessage, aiMessage } = await postEvidence({
          sessionId: session.id,
          session,
          text: transcript.trim(),
          studentName: selectedStudent?.name,
          source: 'voice',
        });
        setMessages((prev) => [...prev, userMessage, aiMessage]);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error con nota de voz');
      } finally {
        setSending(false);
      }
    },
    [session, selectedStudent],
  );

  const handleUpdateAI = useCallback(async (id: string, field: 'evidencia' | 'retroalimentacion', value: string) => {
    setMessages((prev) => prev.map((m) => (m.type === 'ai' && m.id === id ? { ...m, [field]: value } : m)));
    try {
      await patchObservation(id, field, value);
    } catch {
      /* UI ya actualizada; reintento en siguiente blur si se desea */
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="h-12 w-12 rounded-full border-4 border-coral-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center px-6 py-16">
        <p className="text-3xl font-extrabold text-warm-900">No hay clase activa</p>
        <p className="mt-4 text-xl text-warm-700 max-w-md">Prepara o escanea una sesión para entrar al aula.</p>
        <div className="flex flex-col sm:flex-row gap-3 mt-8">
          <a href="/onboarding" className="btn-primary">
            Preparar clase
          </a>
          <a href="/escanear" className="btn-secondary">
            Escanear
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-cream">
      <div className="shrink-0 px-5 sm:px-8 py-5 border-b-2 border-cream-dark bg-gradient-to-r from-white to-honey-200/30">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-extrabold text-coral-600 flex items-center gap-2">
              <span className="inline-block h-3 w-3 rounded-full bg-mint-400 animate-pulse" />
              Clase en curso
            </p>
            {session.grado && session.seccion && (
              <p className="text-base font-bold text-warm-700 mt-0.5">
                {session.grado} · Sección {session.seccion}
              </p>
            )}
            <h1 className="text-2xl sm:text-3xl font-extrabold text-warm-900 mt-1 truncate">
              {session.titulo || session.area}
            </h1>
          </div>
          <a
            href="/"
            className="shrink-0 rounded-2xl border-2 border-cream-dark bg-white px-5 py-3 text-lg font-bold text-warm-700 hover:bg-cream transition-colors focus-ring-warm"
          >
            Salir
          </a>
        </div>
        {error && (
          <p className="mt-2 text-sm font-semibold text-coral-600" role="alert">
            {error}
          </p>
        )}
      </div>

      {students.length === 0 ? (
        <div className="shrink-0 mx-5 mt-4 rounded-2xl border-2 border-coral-500/30 bg-coral-500/10 px-4 py-3 text-center">
          <p className="text-base font-bold text-warm-900">Aún no hay niños/as en esta aula.</p>
          <a href="/mis-pequenos" className="mt-2 inline-block text-base font-bold text-coral-600 underline">
            Registrar mis pequeños
          </a>
        </div>
      ) : (
        <div className="shrink-0 px-5 pt-4 md:hidden">
          <StudentList
            students={students}
            selectedId={selectedStudentId}
            onSelect={setSelectedStudentId}
            variant="carousel"
          />
        </div>
      )}

      <div className="flex flex-1 min-h-0 md:grid md:grid-cols-[28%_72%]">
        <div className="hidden md:block min-h-0">
          {students.length === 0 ? (
            <aside className="flex flex-col h-full border-r-2 border-cream-dark bg-white p-6 text-center justify-center">
              <p className="text-lg font-bold text-warm-900">Sin listado de aula</p>
              <a href="/mis-pequenos" className="btn-primary mt-4 text-base">
                Mis pequeños
              </a>
            </aside>
          ) : (
            <StudentList
              students={students}
              selectedId={selectedStudentId}
              onSelect={setSelectedStudentId}
              variant="sidebar"
            />
          )}
        </div>

        <div className="flex flex-col min-h-0 relative pb-28 md:pb-0">
          <ChatFeed messages={messages} onUpdateAI={handleUpdateAI} />
          <div ref={feedEndRef} className="h-2" aria-hidden />
          <ChatInputBar onSend={handleSend} onVoiceTranscript={handleVoiceTranscript} disabled={sending} />
        </div>
      </div>
    </div>
  );
}
