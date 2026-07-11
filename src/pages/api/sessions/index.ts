import type { APIRoute } from 'astro';
import { requireUser, unauthorizedResponse } from '../../../lib/server/auth';
import { createClassSession, listSessionsForUser } from '../../../lib/server/sessions';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return unauthorizedResponse();

  const url = new URL(request.url);
  const status = url.searchParams.get('status') as 'active' | 'completed' | null;
  const limitStr = url.searchParams.get('limit');
  const offsetStr = url.searchParams.get('offset');

  const limit = limitStr ? parseInt(limitStr, 10) : undefined;
  const offset = offsetStr ? parseInt(offsetStr, 10) : undefined;

  const { sessions, total } = await listSessionsForUser(user.id, {
    status: status || undefined,
    limit,
    offset,
  });

  return new Response(JSON.stringify({ sessions, total }), {
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
