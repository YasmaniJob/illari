import type { APIRoute } from 'astro';
import { requireUser, unauthorizedResponse } from '../../lib/server/auth';
import {
  findExistingAIObs,
  insertUserObservation,
  upsertAIObservation,
} from '../../lib/server/observations';
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
    const students = body.students as string[] | undefined;
    const source = (body.source as 'text' | 'voice') ?? 'text';

    if (!sessionId || !text) {
      return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 });
    }

    // Fetch session + existing AI note in parallel — saves one round-trip
    const [session, existingAIObs] = await Promise.all([
      getSessionById(user.id, sessionId),
      findExistingAIObs(sessionId, studentName ?? null),
    ]);

    if (!session) {
      return new Response(JSON.stringify({ error: 'Sesión no encontrada' }), { status: 404 });
    }

    const previousNote =
      existingAIObs?.evidencia
        ? { evidencia: existingAIObs.evidencia, retroalimentacion: existingAIObs.retroalimentacion ?? '' }
        : undefined;

    const ai = await generatePedagogicalEvidence(
      session, text, studentName, source, students, previousNote,
    );

    if (ai.error) {
      return new Response(JSON.stringify({ error: ai.error }), { status: 400 });
    }

    const resolvedStudentName = ai.studentNameMatch || studentName;

    // Only do the extra DB lookup if the AI matched a *different* student
    let resolvedExisting = existingAIObs;
    if (ai.studentNameMatch && ai.studentNameMatch !== studentName) {
      resolvedExisting = await findExistingAIObs(sessionId, resolvedStudentName ?? null);
    }

    const [userObs, aiObs] = await Promise.all([
      insertUserObservation({ sessionId, text, studentName: resolvedStudentName }),
      upsertAIObservation({
        sessionId,
        evidencia: ai.evidencia || text,
        retroalimentacion: ai.retroalimentacion || '',
        studentName: resolvedStudentName,
        existingId: resolvedExisting?.id,
      }),
    ]);

    const isUpdate = Boolean(resolvedExisting?.id);

    function formatTime(iso: string) {
      return new Intl.DateTimeFormat('es-PE', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
    }

    return new Response(
      JSON.stringify({
        userMessage: { id: userObs.id, type: 'user', text, studentName: resolvedStudentName, timestamp: formatTime(userObs.createdAt) },
        aiMessage: { id: aiObs.id, type: 'ai', evidencia: ai.evidencia, retroalimentacion: ai.retroalimentacion, studentName: resolvedStudentName, timestamp: formatTime(aiObs.createdAt) },
        studentNameMatch: ai.studentNameMatch,
        isUpdate,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[evidence]', e);
    const message = e instanceof Error ? e.message : 'Error al generar evidencia';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
