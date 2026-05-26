import type { APIRoute } from 'astro';
import { requireUser } from '../../lib/server/auth';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) {
    return new Response(JSON.stringify({ user: null }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return new Response(JSON.stringify({ user: { id: user.id, name: user.name, email: user.email } }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
