import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '../../db';
import type { SessionConfig } from '../curriculum';

function rowToConfig(row: typeof schema.classSessions.$inferSelect): SessionConfig {
  return {
    id: row.id,
    titulo: row.titulo ?? undefined,
    grado: row.grado ?? undefined,
    seccion: row.seccion ?? undefined,
    area: row.area,
    competencia: row.competencia,
    capacidad: row.capacidad,
    criterio: row.criterio,
    createdAt: row.createdAt,
    status: row.status as 'active' | 'completed',
  };
}

export async function listSessionsForUser(userId: string): Promise<SessionConfig[]> {
  const rows = await db
    .select()
    .from(schema.classSessions)
    .where(eq(schema.classSessions.userId, userId))
    .orderBy(desc(schema.classSessions.createdAt));
  return rows.map(rowToConfig);
}

export async function getActiveSessionForUser(userId: string): Promise<SessionConfig | null> {
  const [row] = await db
    .select()
    .from(schema.classSessions)
    .where(and(eq(schema.classSessions.userId, userId), eq(schema.classSessions.status, 'active')))
    .orderBy(desc(schema.classSessions.createdAt))
    .limit(1);
  return row ? rowToConfig(row) : null;
}

export async function createClassSession(
  userId: string,
  input: Omit<SessionConfig, 'id' | 'createdAt' | 'status'> & { status?: 'active' },
): Promise<SessionConfig> {
  await db
    .update(schema.classSessions)
    .set({ status: 'completed' })
    .where(and(eq(schema.classSessions.userId, userId), eq(schema.classSessions.status, 'active')));

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await db.insert(schema.classSessions).values({
    id,
    userId,
    titulo: input.titulo ?? null,
    grado: input.grado ?? null,
    seccion: input.seccion ?? null,
    area: input.area,
    competencia: input.competencia,
    capacidad: input.capacidad,
    criterio: input.criterio,
    proposito: '',
    status: 'active',
    createdAt,
  });

  return {
    id,
    ...input,
    status: 'active',
    createdAt,
  };
}

export async function getSessionById(userId: string, sessionId: string): Promise<SessionConfig | null> {
  const [row] = await db
    .select()
    .from(schema.classSessions)
    .where(and(eq(schema.classSessions.id, sessionId), eq(schema.classSessions.userId, userId)))
    .limit(1);
  return row ? rowToConfig(row) : null;
}
