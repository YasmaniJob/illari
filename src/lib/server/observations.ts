import { and, asc, eq, isNull } from 'drizzle-orm';
import type { ChatMessage } from '../../components/aula/ChatFeed';
import { db, schema } from '../../db';

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

/** Intenta parsear el campo evidencia como JSON C+A+I; si falla, trata como texto legado */
function parseEvidencia(raw: string | null): {
  contexto: string;
  accion: string;
  interpretacion: string;
  intervencion?: string;
  interpretacionSugerida?: string;
} | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    if (obj && typeof obj.contexto === 'string') return obj;
  } catch {
    // legado: texto plano
  }
  return null;
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

    const parsed = parseEvidencia(row.evidencia);
    if (parsed) {
      return {
        id: row.id,
        type: 'ai' as const,
        cai: {
          contexto: parsed.contexto,
          accion: parsed.accion,
          interpretacion: parsed.interpretacion,
          intervencion: parsed.intervencion ?? '',
          interpretacionSugerida: parsed.interpretacionSugerida ?? '',
          retroalimentacion: row.retroalimentacion ?? '',
        },
        studentName: row.studentName ?? undefined,
        timestamp: formatTime(row.createdAt),
      };
    }

    // Legado — texto plano en evidencia
    return {
      id: row.id,
      type: 'ai' as const,
      cai: {
        contexto: '',
        accion: row.evidencia ?? '',
        interpretacion: '',
        intervencion: '',
        interpretacionSugerida: '',
        retroalimentacion: row.retroalimentacion ?? '',
      },
      studentName: row.studentName ?? undefined,
      timestamp: formatTime(row.createdAt),
    };
  });
}

export async function insertUserObservation(input: { sessionId: string; text: string; studentName?: string }) {
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

export async function insertAIObservation(input: { sessionId: string; evidencia: string; retroalimentacion: string }) {
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

export async function updateAIObservation(id: string, field: 'evidencia' | 'retroalimentacion', value: string) {
  await db
    .update(schema.observations)
    .set({ [field]: value })
    .where(eq(schema.observations.id, id));
}

/**
 * Returns the existing AI observation row for a specific student in a session,
 * or null if none exists yet. Used to decide whether to INSERT or UPDATE.
 */
export async function findExistingAIObs(
  sessionId: string,
  studentName: string | null,
): Promise<{ id: string; evidencia: string | null; retroalimentacion: string | null } | null> {
  const condition =
    studentName != null
      ? and(
          eq(schema.observations.sessionId, sessionId),
          eq(schema.observations.type, 'ai'),
          eq(schema.observations.studentName, studentName),
        )
      : and(
          eq(schema.observations.sessionId, sessionId),
          eq(schema.observations.type, 'ai'),
          isNull(schema.observations.studentName),
        );

  const rows = await db
    .select({
      id: schema.observations.id,
      evidencia: schema.observations.evidencia,
      retroalimentacion: schema.observations.retroalimentacion,
    })
    .from(schema.observations)
    .where(condition)
    .limit(1);

  return rows[0] ?? null;
}

/**
 * Updates an existing AI observation row, or inserts a new one if none exists.
 * Also attaches studentName to AI rows so we can look them up later.
 */
export async function upsertAIObservation(input: {
  sessionId: string;
  evidencia: string;
  retroalimentacion: string;
  studentName?: string;
  existingId?: string;
}): Promise<{ id: string; createdAt: string }> {
  const createdAt = new Date().toISOString();

  if (input.existingId) {
    await db
      .update(schema.observations)
      .set({
        evidencia: input.evidencia,
        retroalimentacion: input.retroalimentacion,
        createdAt, // bump timestamp so ordering stays consistent
      })
      .where(eq(schema.observations.id, input.existingId));
    return { id: input.existingId, createdAt };
  }

  const id = crypto.randomUUID();
  await db.insert(schema.observations).values({
    id,
    sessionId: input.sessionId,
    type: 'ai',
    evidencia: input.evidencia,
    retroalimentacion: input.retroalimentacion,
    studentName: input.studentName ?? null,
    createdAt,
  });
  return { id, createdAt };
}
