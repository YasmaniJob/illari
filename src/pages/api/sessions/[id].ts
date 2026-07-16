import type { APIRoute } from 'astro';
import { and, eq } from 'drizzle-orm';
import { saveStudentsRoster } from '@/features/students/server/students';
import { requireUser, unauthorizedResponse } from '@/shared/server/auth-middleware';
import { db, schema } from '@/shared/server/db';

export const prerender = false;

/** PATCH /api/sessions/:id — update active session fields + optionally roster */
export const PATCH: APIRoute = async ({ request, params }) => {
  const user = await requireUser(request);
  if (!user) return unauthorizedResponse();

  const sessionId = params.id as string;
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON malformado' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

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
  if (typeof body.evidencia === 'string') updates.evidencia = body.evidencia;

  if (Object.keys(updates).length > 0) {
    await db.update(schema.classSessions).set(updates).where(eq(schema.classSessions.id, sessionId));
  }

  // Optionally update student roster
  if (Array.isArray(body.studentNames) && body.grado && body.seccion) {
    await saveStudentsRoster(
      user.id,
      body.grado ?? existing.grado,
      body.seccion ?? existing.seccion,
      body.studentNames,
    );
  }

  // Return updated session
  const [updated] = await db.select().from(schema.classSessions).where(eq(schema.classSessions.id, sessionId)).limit(1);

  return new Response(JSON.stringify({ session: updated }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
