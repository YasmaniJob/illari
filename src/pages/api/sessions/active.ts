import type { APIRoute } from 'astro';
import { requireUser, unauthorizedResponse } from '../../../lib/server/auth';
import { getActiveSessionForUser } from '../../../lib/server/sessions';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return unauthorizedResponse();

  const session = await getActiveSessionForUser(user.id);
  return new Response(JSON.stringify({ session }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
