import type { APIRoute } from 'astro';
import { getActiveSessionForUser } from '@/features/dashboard/server/sessions';
import { requireUser, unauthorizedResponse } from '@/shared/server/auth-middleware';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return unauthorizedResponse();

  const session = await getActiveSessionForUser(user.id);
  return new Response(JSON.stringify({ session }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
