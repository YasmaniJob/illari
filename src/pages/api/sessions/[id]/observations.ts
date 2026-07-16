import type { APIRoute } from 'astro';
import { getSessionById } from '@/features/dashboard/server/sessions';
import { listObservations } from '@/features/live-classroom/server/observations';
import { requireUser, unauthorizedResponse } from '@/shared/server/auth-middleware';

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
