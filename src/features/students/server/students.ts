import { and, asc, eq } from 'drizzle-orm';
import { db, schema } from '@/shared/server/db';

export interface StudentRow {
  id: string;
  name: string;
  active: boolean;
}

export async function listStudentsForClass(userId: string, grado: string, seccion: string): Promise<StudentRow[]> {
  const rows = await db
    .select()
    .from(schema.students)
    .where(
      and(eq(schema.students.userId, userId), eq(schema.students.grado, grado), eq(schema.students.seccion, seccion)),
    )
    .orderBy(asc(schema.students.name));

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    active: r.active,
  }));
}

/** Reemplaza el listado de un aula con nombres reales del docente */
export async function saveStudentsRoster(
  userId: string,
  grado: string,
  seccion: string,
  names: string[],
): Promise<StudentRow[]> {
  const unique = [...new Set(names.map((n) => n.trim()).filter((n) => n.length >= 2))];

  if (unique.length === 0) {
    await db
      .delete(schema.students)
      .where(
        and(eq(schema.students.userId, userId), eq(schema.students.grado, grado), eq(schema.students.seccion, seccion)),
      );
    return [];
  }

  const createdAt = new Date().toISOString();
  const newRows = unique.map((name) => ({
    id: crypto.randomUUID(),
    userId,
    grado,
    seccion,
    name,
    active: true,
    createdAt,
  }));

  await db.transaction(async (tx) => {
    await tx
      .delete(schema.students)
      .where(
        and(eq(schema.students.userId, userId), eq(schema.students.grado, grado), eq(schema.students.seccion, seccion)),
      );
    await tx.insert(schema.students).values(newRows);
  });

  // Return directly — no extra query needed
  return newRows.map((r) => ({ id: r.id, name: r.name, active: r.active }));
}
