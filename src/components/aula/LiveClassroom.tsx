import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  fetchActiveSession,
  fetchObservations,
  fetchStudents,
  isLoggedIn,
  patchObservation,
  postEvidence,
  type StudentDto,
} from '../../lib/api/client';
import type { SessionConfig } from '../../lib/curriculum';
import ChatFeed, { type ChatMessage } from './ChatFeed';
import ChatInputBar from './ChatInputBar';
import CuadernoCampo from './CuadernoCampo';
import EditSessionDrawer from './EditSessionDrawer';
import PropositoModal from './PropositoModal';
import StudentList from './StudentList';
import StudentPickerSheet from './StudentPickerSheet';

export default function LiveClassroom() {
  const [session, setSession] = useState<SessionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentDto[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loggedIn, setLoggedIn] = useState(false);
  const [showCuaderno, setShowCuaderno] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showProposito, setShowProposito] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [errorModal, setErrorModal] = useState<{ title: string; message: string; name?: string } | null>(null);


  useEffect(() => {
    async function load() {
      try {
        const [active, logged] = await Promise.all([fetchActiveSession(), isLoggedIn()]);
        setLoggedIn(logged);
        setSession(active);
        if (active?.grado && active?.seccion) {
          const [msgs, studs] = await Promise.all([
            fetchObservations(active.id),
            fetchStudents(active.grado, active.seccion),
          ]);
          setMessages(msgs);
          setStudents(studs);
          setSelectedStudentId(null);
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



  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId),
    [students, selectedStudentId],
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (!session) return;
      setSending(true);
      setError(null);
      try {
        const { userMessage, aiMessage, studentNameMatch, isUpdate } = await postEvidence({
          sessionId: session.id,
          session,
          text,
          studentName: selectedStudent?.name,
          students: students.map((s) => s.name),
          source: 'text',
        });

        setMessages((prev) => {
          // Always append the user message (docente's diary)
          const withUser = [...prev, userMessage];
          if (isUpdate) {
            // Replace the existing AI card for this student with the synthesized version
            const replaced = withUser.map((m) => (m.type === 'ai' && m.id === aiMessage.id ? aiMessage : m));
            // If the old ID was not in the list yet (first synthesis), just append
            return replaced.some((m) => m.id === aiMessage.id) ? replaced : [...withUser, aiMessage];
          }
          return [...withUser, aiMessage];
        });

        if (studentNameMatch) {
          const matched = students.find(
            (s) => s.name.toLowerCase() === studentNameMatch.toLowerCase(),
          );
          if (matched) {
            setSelectedStudentId(matched.id);
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'No se pudo registrar';
        const match = msg.match(/No veo a (.+?) en la lista/i);
        if (match) {
          setErrorModal({
            title: 'Estudiante no registrado',
            message: msg,
            name: match[1],
          });
        } else {
          setError(msg);
        }
      } finally {
        setSending(false);
      }
    },
    [session, selectedStudent, students],
  );

  const handleVoiceTranscript = useCallback(
    async (transcript: string) => {
      if (!session || !transcript.trim()) return;
      setSending(true);
      setError(null);
      try {
        const { userMessage, aiMessage, studentNameMatch, isUpdate } = await postEvidence({
          sessionId: session.id,
          session,
          text: transcript.trim(),
          studentName: selectedStudent?.name,
          students: students.map((s) => s.name),
          source: 'voice',
        });

        setMessages((prev) => {
          const withUser = [...prev, userMessage];
          if (isUpdate) {
            const replaced = withUser.map((m) => (m.type === 'ai' && m.id === aiMessage.id ? aiMessage : m));
            return replaced.some((m) => m.id === aiMessage.id) ? replaced : [...withUser, aiMessage];
          }
          return [...withUser, aiMessage];
        });

        if (studentNameMatch) {
          const matched = students.find(
            (s) => s.name.toLowerCase() === studentNameMatch.toLowerCase(),
          );
          if (matched) {
            setSelectedStudentId(matched.id);
          }
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Error con nota de voz';
        const match = msg.match(/No veo a (.+?) en la lista/i);
        if (match) {
          setErrorModal({
            title: 'Estudiante no registrado',
            message: msg,
            name: match[1],
          });
        } else {
          setError(msg);
        }
      } finally {
        setSending(false);
      }
    },
    [session, selectedStudent, students],
  );

  const handleUpdateAI = useCallback(async (id: string, field: 'evidencia' | 'retroalimentacion', value: string) => {
    setMessages((prev) => prev.map((m) => (m.type === 'ai' && m.id === id ? { ...m, [field]: value } : m)));
    try {
      await patchObservation(id, field, value);
    } catch {
      /* UI ya actualizada */
    }
  }, []);

  const handleSessionSaved = useCallback((updated: SessionConfig, updatedStudents: StudentDto[]) => {
    setSession(updated);
    if (updatedStudents.length > 0) {
      setStudents(updatedStudents);
      setSelectedStudentId(updatedStudents[0]?.id ?? null);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-10 w-10 rounded-full border-4 border-coral-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center px-6">
        <p className="text-2xl font-extrabold text-warm-900">No hay clase activa</p>
        <p className="mt-3 text-lg text-warm-700 max-w-md">Prepara o escanea una sesión para entrar al aula.</p>
        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <a href="/onboarding" className="btn-primary">Preparar clase</a>
          <a href="/escanear" className="btn-secondary">Escanear</a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-cream overflow-hidden">

      {/* ── Session header ── */}
      <div className="shrink-0 px-5 sm:px-7 py-3 border-b border-cream-dark bg-white flex items-center gap-4">
        {/* Session info */}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg sm:text-xl font-extrabold text-warm-900 truncate leading-snug">
            {session.titulo || session.area}
          </h1>
        </div>

        {/* Action buttons — always visible */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Propósito */}
          <button
            type="button"
            onClick={() => setShowProposito(true)}
            className="flex items-center gap-1.5 rounded-xl border border-honey-400/50 bg-honey-200/40 px-3 py-1.5 text-xs font-bold text-warm-700 hover:bg-honey-200/70 transition-colors focus-ring-warm"
            title="Ver propósito de aprendizaje"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="hidden sm:inline">Propósito</span>
          </button>

          {/* Editar sesión */}
          <button
            type="button"
            onClick={() => setShowEdit(true)}
            className="flex items-center gap-1.5 rounded-xl border border-cream-dark bg-white px-3 py-1.5 text-xs font-bold text-warm-600 hover:bg-cream transition-colors focus-ring-warm"
            title="Editar sesión"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            <span className="hidden sm:inline">Editar</span>
          </button>

          {/* Cuaderno de Campo */}
          <button
            type="button"
            onClick={() => setShowCuaderno(true)}
            className="flex items-center gap-1.5 rounded-xl border border-lilac-300 bg-lilac-50 px-3 py-1.5 text-xs font-bold text-lilac-700 hover:bg-lilac-100 transition-colors focus-ring-warm"
            title="Vista previa del Cuaderno de Campo"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span className="hidden sm:inline">Cuaderno</span>
          </button>

          {/* Salir — solo usuarios con sesión */}
          {loggedIn && (
            <a
              href="/"
              className="rounded-xl border border-cream-dark bg-white px-3 py-1.5 text-xs font-bold text-warm-600 hover:bg-cream transition-colors focus-ring-warm"
            >
              Salir
            </a>
          )}
        </div>
      </div>

      {error && (
        <div className="shrink-0 px-4 py-2 bg-coral-500/10 border-b border-coral-500/20">
          <p className="text-xs font-semibold text-coral-600" role="alert">{error}</p>
        </div>
      )}

      {/* ── Main: sidebar + chat ── */}
      <div className="flex flex-1 min-h-0 md:grid md:grid-cols-[300px_1fr]">

        {/* Sidebar desktop */}
        <div className="hidden md:flex md:flex-col border-r border-cream-dark bg-white min-h-0">
          {students.length === 0 ? (
            <div className="flex flex-col flex-1 items-center justify-center p-6 text-center">
              <p className="text-sm font-bold text-warm-900">Sin listado de aula</p>
              <a href="/mis-pequenos" className="btn-primary mt-3 text-sm">Mis estudiantes</a>
            </div>
          ) : (
            <StudentList
              students={students}
              selectedId={selectedStudentId}
              onSelect={(id) => setSelectedStudentId(id)}
              variant="sidebar"
              grado={session.grado ?? undefined}
              seccion={session.seccion ?? undefined}
            />
          )}
        </div>

        {/* Chat area */}
        <div className="flex flex-col min-h-0">
          <ChatFeed messages={messages} sending={sending} onUpdateAI={handleUpdateAI} />
          <ChatInputBar
            onSend={handleSend}
            onVoiceTranscript={handleVoiceTranscript}
            disabled={sending}
            selectedStudent={selectedStudent ?? null}
            onClearStudent={() => setSelectedStudentId(null)}
            onOpenPicker={students.length > 0 ? () => setShowPicker(true) : undefined}
          />
        </div>
      </div>

      {/* Cuaderno de Campo modal */}
      {showCuaderno && (
        <CuadernoCampo
          session={session}
          students={students}
          messages={messages}
          onClose={() => setShowCuaderno(false)}
        />
      )}

      {/* Edit session drawer */}
      {showEdit && (
        <EditSessionDrawer
          session={session}
          onClose={() => setShowEdit(false)}
          onSaved={(updated, updatedStudents) => {
            handleSessionSaved(updated, updatedStudents);
            setShowEdit(false);
          }}
        />
      )}

      {/* errorModal (Estudiante no registrado) */}
      {errorModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-sm animate-fade-in"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border-2 border-honey-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-3xl bg-honey-200 text-3xl mb-4 animate-bounce">
                🔍
              </span>
              <h2 className="text-xl font-extrabold text-warm-900 leading-tight">
                {errorModal.title}
              </h2>
              <p className="mt-3 text-base text-warm-700 leading-relaxed">
                Escribiste una observación para <strong className="text-coral-600 font-extrabold">{errorModal.name}</strong>, pero no figura en la lista de estudiantes inscritos en esta sección.
              </p>
              
              <div className="w-full mt-4 p-4 rounded-2xl bg-cream border border-cream-dark text-left">
                <p className="text-xs font-bold text-warm-800 uppercase tracking-wider mb-2">¿Cómo solucionarlo?</p>
                <ul className="text-xs font-semibold text-warm-600 space-y-1.5 list-disc pl-4">
                  <li>Agrega a {errorModal.name} a la lista de estudiantes de esta sección.</li>
                  <li>O asegúrate de escribir el nombre exacto de un alumno registrado.</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={() => {
                  setErrorModal(null);
                  setShowEdit(true);
                }}
                className="flex-1 rounded-xl bg-coral-500 py-3 text-sm font-bold text-white hover:bg-coral-600 transition-colors focus-ring-warm shadow-md"
              >
                Agregar a {errorModal.name}
              </button>
              <button
                type="button"
                onClick={() => setErrorModal(null)}
                className="rounded-xl border border-cream-dark bg-white px-5 py-3 text-sm font-bold text-warm-600 hover:bg-cream transition-colors focus-ring-warm"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Propósito de aprendizaje */}
      {showProposito && (
        <PropositoModal
          session={session}
          onClose={() => setShowProposito(false)}
        />
      )}

      {/* Student picker — bottom sheet */}
      {showPicker && (
        <StudentPickerSheet
          students={students}
          selectedId={selectedStudentId}
          grado={session.grado ?? undefined}
          seccion={session.seccion ?? undefined}
          onSelect={(id) => setSelectedStudentId(id)}
          onClose={() => setShowPicker(false)}
        />
      )}
    </div>
  );
}
