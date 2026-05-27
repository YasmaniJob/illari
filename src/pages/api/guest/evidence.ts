import type { APIRoute } from 'astro';
import type { SessionConfig } from '../../../lib/curriculum';
import { generatePedagogicalEvidence } from '../../../lib/server/pedagogicalEvidence';

export const prerender = false;

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const text = (body.text as string)?.trim();
    const studentName = body.studentName as string | undefined;
    const students = body.students as string[] | undefined;
    const source = (body.source as 'text' | 'voice') ?? 'text';
    const session = body.session as SessionConfig | undefined;

    if (!session?.area || !text) {
      return new Response(JSON.stringify({ error: 'Datos incompletos' }), { status: 400 });
    }

    const ai = await generatePedagogicalEvidence(session, text, studentName, source, students);

    // If Gemini returned a validation error, abort
    if (ai.error) {
      return new Response(JSON.stringify({ error: ai.error }), { status: 400 });
    }

    const resolvedStudentName = ai.studentNameMatch || studentName;
    const now = new Date().toISOString();

    return new Response(
      JSON.stringify({
        userMessage: {
          id: crypto.randomUUID(),
          type: 'user',
          text,
          studentName: resolvedStudentName,
          timestamp: formatTime(now),
        },
        aiMessage: {
          id: crypto.randomUUID(),
          type: 'ai',
          evidencia: ai.evidencia,
          retroalimentacion: ai.retroalimentacion,
          studentName: resolvedStudentName,
          timestamp: formatTime(now),
        },
        studentNameMatch: ai.studentNameMatch,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[guest/evidence]', e);
    const message = e instanceof Error ? e.message : 'Error al generar evidencia';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
