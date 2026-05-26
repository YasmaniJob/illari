import type { APIRoute } from 'astro';
import { requireUser } from '../../../lib/server/auth';
import {
  listStudentsForClass,
  saveStudentsRoster,
} from '../../../lib/server/students';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  const user = await requireUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
  }

  const grado = url.searchParams.get('grado');
  const seccion = url.searchParams.get('seccion');

  if (!grado || !seccion) {
    return new Response(
      JSON.stringify({ error: 'grado y seccion son requeridos' }),
      { status: 400 },
    );
  }

  const students = await listStudentsForClass(user.id, grado, seccion);
  return new Response(JSON.stringify({ students }), {
    headers: { 'Content-Type': 'application/json' },
  });
};

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 });
  }

  try {
    const body = await request.json();
    const grado = body?.grado as string | undefined;
    const seccion = body?.seccion as string | undefined;
    const names = body?.names as string[] | undefined;

    if (!grado || !seccion || !Array.isArray(names)) {
      return new Response(
        JSON.stringify({ error: 'grado, seccion y names son requeridos' }),
        { status: 400 },
      );
    }

    const students = await saveStudentsRoster(user.id, grado, seccion, names);
    return new Response(JSON.stringify({ students }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'No se pudo guardar el listado' }), {
      status: 500,
    });
  }
};
