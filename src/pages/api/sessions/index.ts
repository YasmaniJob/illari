import type { APIRoute } from 'astro';
import { requireUser, unauthorizedResponse } from '../../../lib/server/auth';
import { createClassSession, listSessionsForUser } from '../../../lib/server/sessions';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return unauthorizedResponse();
  const sessions = await listSessionsForUser(user.id);
  return new Response(JSON.stringify({ sessions }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return unauthorizedResponse();

  const body = await request.json();
  const session = await createClassSession(user.id, {
    titulo: body.titulo,
    grado: body.grado,
    seccion: body.seccion,
    area: body.area,
    competencia: body.competencia,
    capacidad: body.capacidad,
    criterio: body.criterio,
    evidencia: body.evidencia,
  });

  return new Response(JSON.stringify({ session }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
