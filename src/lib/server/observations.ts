import { asc, eq } from 'drizzle-orm';
import { db, schema } from '../../db';
import type { ChatMessage } from '../../components/aula/ChatFeed';

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export async function listObservations(sessionId: string): Promise<ChatMessage[]> {
  const rows = await db
    .select()
    .from(schema.observations)
    .where(eq(schema.observations.sessionId, sessionId))
    .orderBy(asc(schema.observations.createdAt));

  return rows.map((row) => {
    if (row.type === 'user') {
      return {
        id: row.id,
        type: 'user' as const,
        text: row.text ?? '',
        studentName: row.studentName ?? undefined,
        timestamp: formatTime(row.createdAt),
      };
    }
    return {
      id: row.id,
      type: 'ai' as const,
      evidencia: row.evidencia ?? '',
      retroalimentacion: row.retroalimentacion ?? '',
      timestamp: formatTime(row.createdAt),
    };
  });
}

export async function insertUserObservation(input: {
  sessionId: string;
  text: string;
  studentName?: string;
}) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await db.insert(schema.observations).values({
    id,
    sessionId: input.sessionId,
    type: 'user',
    text: input.text,
    studentName: input.studentName ?? null,
    createdAt,
  });
  return { id, createdAt };
}

export async function insertAIObservation(input: {
  sessionId: string;
  evidencia: string;
  retroalimentacion: string;
}) {
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await db.insert(schema.observations).values({
    id,
    sessionId: input.sessionId,
    type: 'ai',
    evidencia: input.evidencia,
    retroalimentacion: input.retroalimentacion,
    createdAt,
  });
  return { id, createdAt };
}

export async function updateAIObservation(
  id: string,
  field: 'evidencia' | 'retroalimentacion',
  value: string,
) {
  await db
    .update(schema.observations)
    .set({ [field]: value })
    .where(eq(schema.observations.id, id));
}
