import { and, desc, eq, sql } from 'drizzle-orm';
import type { SessionConfig } from '@/features/curriculum/curriculum';
import { db, schema } from '@/shared/server/db';

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
    evidencia: row.evidencia ?? '',
    createdAt: row.createdAt,
    status: row.status as 'active' | 'completed',
  };
}

export async function listSessionsForUser(
  userId: string,
  options?: {
    status?: 'active' | 'completed';
    limit?: number;
    offset?: number;
  },
): Promise<{ sessions: SessionConfig[]; total: number }> {
  let conditions = eq(schema.classSessions.userId, userId);
  if (options?.status) {
    conditions = and(conditions, eq(schema.classSessions.status, options.status)) as any;
  }

  const countRes = await db.select({ count: sql<number>`count(*)` }).from(schema.classSessions).where(conditions);
  const total = Number(countRes[0]?.count ?? 0);

  let query = db.select().from(schema.classSessions).where(conditions).orderBy(desc(schema.classSessions.createdAt));

  if (options?.limit !== undefined) {
    query = query.limit(options.limit) as any;
  }
  if (options?.offset !== undefined) {
    query = query.offset(options.offset) as any;
  }

  const rows = await query;
  return {
    sessions: rows.map(rowToConfig),
    total,
  };
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
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();

  await db.transaction(async (tx) => {
    await tx
      .update(schema.classSessions)
      .set({ status: 'completed' })
      .where(and(eq(schema.classSessions.userId, userId), eq(schema.classSessions.status, 'active')));

    await tx.insert(schema.classSessions).values({
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
      evidencia: input.evidencia ?? '',
      status: 'active',
      createdAt,
    });
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
