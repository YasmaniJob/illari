import type { ChatMessage } from '../../components/aula/ChatFeed';
import type { StudentDto } from '../api/client';
import type { SessionConfig } from '../curriculum';

const STORAGE_KEY = 'mi-wawita-guest-v1';

interface GuestData {
  activeSession: SessionConfig | null;
  students: Record<string, StudentDto[]>;
  observations: Record<string, ChatMessage[]>;
}

function rosterKey(grado: string, seccion: string) {
  return `${grado}::${seccion}`;
}

function read(): GuestData {
  if (typeof window === 'undefined') {
    return { activeSession: null, students: {}, observations: {} };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { activeSession: null, students: {}, observations: {} };
    return JSON.parse(raw) as GuestData;
  } catch {
    return { activeSession: null, students: {}, observations: {} };
  }
}

function write(data: GuestData) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function guestGetActiveSession(): SessionConfig | null {
  return read().activeSession;
}

export function guestCreateSession(input: Omit<SessionConfig, 'id' | 'createdAt' | 'status'>): SessionConfig {
  const session: SessionConfig = {
    id: crypto.randomUUID(),
    ...input,
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  const data = read();
  data.activeSession = session;
  write(data);
  return session;
}

export function guestSaveStudents(grado: string, seccion: string, names: string[]): StudentDto[] {
  const students: StudentDto[] = names.map((name) => ({
    id: crypto.randomUUID(),
    name,
    active: true,
  }));
  const data = read();
  data.students[rosterKey(grado, seccion)] = students;
  write(data);
  return students;
}

export function guestGetStudents(grado: string, seccion: string): StudentDto[] {
  return read().students[rosterKey(grado, seccion)] ?? [];
}

export function guestGetObservations(sessionId: string): ChatMessage[] {
  return read().observations[sessionId] ?? [];
}

export function guestAppendObservations(sessionId: string, userMessage: ChatMessage, aiMessage: ChatMessage) {
  const data = read();
  const list = data.observations[sessionId] ?? [];
  data.observations[sessionId] = [...list, userMessage, aiMessage];
  write(data);
}

export function guestPatchObservation(id: string, field: 'evidencia' | 'retroalimentacion', value: string) {
  const data = read();
  for (const sessionId of Object.keys(data.observations)) {
    data.observations[sessionId] = data.observations[sessionId].map((m) => {
      if (m.type !== 'ai' || m.id !== id) return m;
      if (field === 'retroalimentacion') {
        return { ...m, cai: { ...m.cai, retroalimentacion: value } };
      }
      // evidencia field stores JSON with contexto/accion/interpretacion
      try {
        const parsed = JSON.parse(value);
        return { ...m, cai: { ...m.cai, ...parsed } };
      } catch {
        return { ...m, cai: { ...m.cai, accion: value } };
      }
    });
  }
  write(data);
}

export function guestPatchSession(updates: Partial<SessionConfig>): SessionConfig {
  const data = read();
  if (!data.activeSession) throw new Error('No hay sesión activa');
  data.activeSession = {
    ...data.activeSession,
    ...updates,
  };
  write(data);
  return data.activeSession;
}
