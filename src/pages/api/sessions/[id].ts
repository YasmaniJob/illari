import type { APIRoute } from 'astro';
import { requireUser, unauthorizedResponse } from '../../../lib/server/auth';
import { db, schema } from '../../../db';
import { and, eq } from 'drizzle-orm';
import { saveStudentsRoster } from '../../../lib/server/students';

export const prerender = false;

/** PATCH /api/sessions/:id — update active session fields + optionally roster */
export const PATCH: APIRoute = async ({ request, params }) => {
  const user = await requireUser(request);
  if (!user) return unauthorizedResponse();

  const sessionId = params.id as string;
  const body = await request.json();

  // Verify ownership
  const [existing] = await db
    .select()
    .from(schema.classSessions)
    .where(and(eq(schema.classSessions.id, sessionId), eq(schema.classSessions.userId, user.id)))
    .limit(1);

  if (!existing) {
    return new Response(JSON.stringify({ error: 'Sesión no encontrada' }), { status: 404 });
  }

  // Build update payload — only allow known fields
  const updates: Partial<typeof schema.classSessions.$inferInsert> = {};
  if (typeof body.titulo === 'string') updates.titulo = body.titulo || null;
  if (typeof body.grado === 'string') updates.grado = body.grado || null;
  if (typeof body.seccion === 'string') updates.seccion = body.seccion || null;
  if (typeof body.area === 'string') updates.area = body.area;
  if (typeof body.competencia === 'string') updates.competencia = body.competencia;
  if (typeof body.capacidad === 'string') updates.capacidad = body.capacidad;
  if (typeof body.criterio === 'string') updates.criterio = body.criterio;

  if (Object.keys(updates).length > 0) {
    await db
      .update(schema.classSessions)
      .set(updates)
      .where(eq(schema.classSessions.id, sessionId));
  }

  // Optionally update student roster
  if (Array.isArray(body.studentNames) && body.grado && body.seccion) {
    await saveStudentsRoster(user.id, body.grado ?? existing.grado, body.seccion ?? existing.seccion, body.studentNames);
  }

  // Return updated session
  const [updated] = await db
    .select()
    .from(schema.classSessions)
    .where(eq(schema.classSessions.id, sessionId))
    .limit(1);

  return new Response(JSON.stringify({ session: updated }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
