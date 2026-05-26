import { auth } from '../auth';

export async function requireUser(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return null;
  }
  return session.user;
}

export function unauthorizedResponse() {
  return new Response(JSON.stringify({ error: 'No autenticado' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
}
