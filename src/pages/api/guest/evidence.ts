import type { APIRoute } from 'astro';
import type { SessionConfig } from '@/features/curriculum/curriculum';
import { parseCurriculumCsv } from '@/features/curriculum/curriculum';
import curriculoRaw from '@/features/curriculum/data/curriculo.csv?raw';
import { generatePedagogicalEvidence } from '@/features/live-classroom/server/pedagogicalEvidence';

export const prerender = false;

const curriculum = parseCurriculumCsv(curriculoRaw);

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'America/Lima',
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

    const result = await generatePedagogicalEvidence(session, text, curriculum, studentName, source, students);

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), { status: 400 });
    }

    const cai = result.cai!;
    const resolvedStudentName = result.studentNameMatch || studentName;
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
          cai,
          studentName: resolvedStudentName,
          timestamp: formatTime(now),
        },
        studentNameMatch: result.studentNameMatch,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error('[guest/evidence]', e);
    const message = e instanceof Error ? e.message : 'Error al generar evidencia';
    return new Response(JSON.stringify({ error: message }), { status: 500 });
  }
};
