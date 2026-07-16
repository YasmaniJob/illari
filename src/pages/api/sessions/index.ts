import type { APIRoute } from 'astro';
import { createClassSession, listSessionsForUser } from '@/features/dashboard/server/sessions';
import { requireUser, unauthorizedResponse } from '@/shared/server/auth-middleware';

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

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON malformado' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (
    typeof body.area !== 'string' ||
    !body.area.trim() ||
    typeof body.competencia !== 'string' ||
    !body.competencia.trim() ||
    typeof body.capacidad !== 'string' ||
    !body.capacidad.trim() ||
    typeof body.criterio !== 'string' ||
    !body.criterio.trim()
  ) {
    return new Response(
      JSON.stringify({ error: 'Datos de sesión incompletos. Se requiere: area, competencia, capacidad, criterio.' }),
      {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  }

  const session = await createClassSession(user.id, {
    titulo: body.titulo,
    grado: body.grado,
    seccion: body.seccion,
    area: body.area.trim(),
    competencia: body.competencia.trim(),
    capacidad: body.capacidad.trim(),
    criterio: body.criterio.trim(),
    evidencia: body.evidencia,
  });

  return new Response(JSON.stringify({ session }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' },
  });
};
