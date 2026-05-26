import type { APIRoute } from 'astro';
import { requireUser, unauthorizedResponse } from '../../lib/server/auth';
import { insertAIObservation, insertUserObservation } from '../../lib/server/observations';
import { generatePedagogicalEvidence } from '../../lib/server/pedagogicalEvidence';
import { getSessionById } from '../../lib/server/sessions';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const sessionId = body.sessionId as string;
    const text = (body.text as string)?.trim();
    const studentName = body.studentName as string | undefined;
    const source = (body.source as 'text' | 'voice') ?? 'text';

    if (!sessionId || !text) {
      return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 });
    }

    const session = await getSessionById(user.id, sessionId);
    if (!session) {
      return new Response(JSON.stringify({ error: 'Sesión no encontrada' }), { status: 404 });
    }

    const userObs = await insertUserObservation({
      sessionId,
      text,
      studentName,
    });

    const ai = await generatePedagogicalEvidence(session, text, studentName, source);
    const aiObs = await insertAIObservation({
      sessionId,
      evidencia: ai.evidencia,
      retroalimentacion: ai.retroalimentacion,
    });

    function formatTime(iso: string) {
      return new Intl.DateTimeFormat('es-PE', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(iso));
    }

    return new Response(
      JSON.stringify({
        userMessage: {
          id: userObs.id,
          type: 'user',
          text,
          studentName,
          timestamp: formatTime(userObs.createdAt),
        },
        aiMessage: {
          id: aiObs.id,
          type: 'ai',
          evidencia: ai.evidencia,
          retroalimentacion: ai.retroalimentacion,
          timestamp: formatTime(aiObs.createdAt),
        },
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Error al generar evidencia' }), { status: 500 });
  }
};
