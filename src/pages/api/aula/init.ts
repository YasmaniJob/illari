/**
 * GET /api/aula/init
 * Single endpoint that returns session + observations + students in one round-trip.
 * Replaces 3 serial fetches (active session → observations → students) with 1.
 */
import type { APIRoute } from 'astro';
import { requireUser, unauthorizedResponse } from '../../../lib/server/auth';
import { listObservations } from '../../../lib/server/observations';
import { getActiveSessionForUser } from '../../../lib/server/sessions';
import { listStudentsForClass } from '../../../lib/server/students';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return unauthorizedResponse();

  // Fetch active session first — we need it to know grado/seccion for students
  const session = await getActiveSessionForUser(user.id);

  if (!session) {
    return new Response(JSON.stringify({ session: null, messages: [], students: [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Fetch observations + students in parallel
  const [messages, students] = await Promise.all([
    listObservations(session.id),
    session.grado && session.seccion
      ? listStudentsForClass(user.id, session.grado, session.seccion)
      : Promise.resolve([]),
  ]);

  return new Response(JSON.stringify({ session, messages, students }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
