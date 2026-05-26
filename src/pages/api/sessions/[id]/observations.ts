import type { APIRoute } from 'astro';
import { requireUser, unauthorizedResponse } from '../../../../lib/server/auth';
import { listObservations } from '../../../../lib/server/observations';
import { getSessionById } from '../../../../lib/server/sessions';

export const prerender = false;

export const GET: APIRoute = async ({ params, request }) => {
  const user = await requireUser(request);
  if (!user) return unauthorizedResponse();

  const sessionId = params.id;
  if (!sessionId) {
    return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
  }

  const session = await getSessionById(user.id, sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Sesión no encontrada' }), { status: 404 });
  }

  const messages = await listObservations(sessionId);
  return new Response(JSON.stringify({ messages }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
