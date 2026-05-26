import type { APIRoute } from 'astro';
import { requireUser, unauthorizedResponse } from '../../../lib/server/auth';
import { updateAIObservation } from '../../../lib/server/observations';

export const prerender = false;

export const PATCH: APIRoute = async ({ params, request }) => {
  const user = await requireUser(request);
  if (!user) return unauthorizedResponse();

  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
  }

  const body = await request.json();
  const field = body.field as 'evidencia' | 'retroalimentacion';
  const value = body.value as string;

  if (!field || typeof value !== 'string') {
    return new Response(JSON.stringify({ error: 'Campo inválido' }), { status: 400 });
  }

  await updateAIObservation(id, field, value);
  return new Response(JSON.stringify({ ok: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
