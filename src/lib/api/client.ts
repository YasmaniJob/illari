import type { SessionConfig } from '../curriculum';
import type { ChatMessage } from '../../components/aula/ChatFeed';
import {
  guestAppendObservations,
  guestCreateSession,
  guestGetActiveSession,
  guestGetObservations,
  guestGetStudents,
  guestPatchObservation,
  guestSaveStudents,
} from '../guest/store';

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
    ...init,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error((data as { error?: string }).error ?? 'Error de API');
  }
  return data as T;
}

let loggedIn: boolean | null = null;

export async function isLoggedIn(): Promise<boolean> {
  if (loggedIn !== null) return loggedIn;
  try {
    const res = await fetch('/api/me', { credentials: 'include' });
    const data = (await res.json()) as { user: { id: string } | null };
    loggedIn = !!data.user;
    return loggedIn;
  } catch {
    loggedIn = false;
    return false;
  }
}

export function clearAuthCache() {
  loggedIn = null;
}

export async function fetchSessions(): Promise<SessionConfig[]> {
  if (!(await isLoggedIn())) return [];
  const { sessions } = await api<{ sessions: SessionConfig[] }>('/api/sessions');
  return sessions;
}

export async function fetchActiveSession(): Promise<SessionConfig | null> {
  if (await isLoggedIn()) {
    const { session } = await api<{ session: SessionConfig | null }>('/api/sessions/active');
    return session;
  }
  return guestGetActiveSession();
}

export async function createSession(
  input: Omit<SessionConfig, 'id' | 'createdAt' | 'status'>,
): Promise<SessionConfig> {
  if (await isLoggedIn()) {
    const { session } = await api<{ session: SessionConfig }>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return session;
  }
  return guestCreateSession(input);
}

export async function fetchObservations(sessionId: string): Promise<ChatMessage[]> {
  if (await isLoggedIn()) {
    const { messages } = await api<{ messages: ChatMessage[] }>(
      `/api/sessions/${sessionId}/observations`,
    );
    return messages;
  }
  return guestGetObservations(sessionId);
}

export async function postEvidence(input: {
  sessionId: string;
  text: string;
  studentName?: string;
  source?: 'text' | 'voice';
  session?: SessionConfig;
}): Promise<{ userMessage: ChatMessage; aiMessage: ChatMessage }> {
  if (await isLoggedIn()) {
    return api('/api/evidence', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  const session = input.session ?? guestGetActiveSession();
  if (!session) throw new Error('No hay sesión activa');

  const result = await api<{ userMessage: ChatMessage; aiMessage: ChatMessage }>(
    '/api/guest/evidence',
    {
      method: 'POST',
      body: JSON.stringify({
        session,
        text: input.text,
        studentName: input.studentName,
        source: input.source,
      }),
    },
  );
  guestAppendObservations(session.id, result.userMessage, result.aiMessage);
  return result;
}

export interface StudentDto {
  id: string;
  name: string;
  active: boolean;
}

export async function fetchStudents(
  grado: string,
  seccion: string,
): Promise<StudentDto[]> {
  if (await isLoggedIn()) {
    const params = new URLSearchParams({ grado, seccion });
    const { students } = await api<{ students: StudentDto[] }>(
      `/api/students?${params}`,
    );
    return students;
  }
  return guestGetStudents(grado, seccion);
}

export async function saveStudents(
  grado: string,
  seccion: string,
  names: string[],
): Promise<StudentDto[]> {
  if (await isLoggedIn()) {
    const { students } = await api<{ students: StudentDto[] }>('/api/students', {
      method: 'POST',
      body: JSON.stringify({ grado, seccion, names }),
    });
    return students;
  }
  return guestSaveStudents(grado, seccion, names);
}

export async function patchObservation(
  id: string,
  field: 'evidencia' | 'retroalimentacion',
  value: string,
): Promise<void> {
  if (await isLoggedIn()) {
    await api(`/api/observations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ field, value }),
    });
    return;
  }
  guestPatchObservation(id, field, value);
}
