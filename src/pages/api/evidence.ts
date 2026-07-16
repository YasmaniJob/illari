import type { APIRoute } from 'astro';
import { parseCurriculumCsv } from '@/features/curriculum/curriculum';
import curriculoRaw from '@/features/curriculum/data/curriculo.csv?raw';
import { getSessionById } from '@/features/dashboard/server/sessions';
import {
  findExistingAIObs,
  insertUserObservation,
  upsertAIObservation,
} from '@/features/live-classroom/server/observations';
import { type EvidenciaCAI, generatePedagogicalEvidence } from '@/features/live-classroom/server/pedagogicalEvidence';
import { requireUser, unauthorizedResponse } from '@/shared/server/auth-middleware';
import { formatTime } from '@/shared/server/utils';

export const prerender = false;

// Parse once at module load — no cost per request
const curriculum = parseCurriculumCsv(curriculoRaw);

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

    // Fetch session + existing AI note in parallel
    const [session, existingAIObs] = await Promise.all([
      getSessionById(user.id, sessionId),
      findExistingAIObs(sessionId, studentName ?? null),
    ]);

    if (!session) {
      return new Response(JSON.stringify({ error: 'Sesión no encontrada' }), { status: 404 });
    }

    // Reconstruct previous CAI note if it exists
    let previousNote: EvidenciaCAI | undefined;
    if (existingAIObs?.evidencia) {
      try {
        const parsed = JSON.parse(existingAIObs.evidencia);
        previousNote = {
          contexto: parsed.contexto ?? '',
          accion: parsed.accion ?? '',
          interpretacion: parsed.interpretacion ?? '',
          interpretacionSugerida: parsed.interpretacionSugerida ?? '',
          intervencion: parsed.intervencion ?? '',
          retroalimentacion: existingAIObs.retroalimentacion ?? '',
        };
      } catch {
        previousNote = {
          contexto: '',
          accion: existingAIObs.evidencia,
          interpretacion: '',
          interpretacionSugerida: '',
          intervencion: '',
          retroalimentacion: existingAIObs.retroalimentacion ?? '',
        };
      }
    }

    const result = await generatePedagogicalEvidence(
      session,
      text,
      curriculum,
      studentName,
      source,
      students,
      previousNote,
    );

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), { status: 400 });
    }

    const cai = result.cai!;
    const resolvedStudentName = result.studentNameMatch || studentName;

    // Only do the extra DB lookup if AI matched a different student
    let resolvedExisting = existingAIObs;
    if (result.studentNameMatch && result.studentNameMatch !== studentName) {
      resolvedExisting = await findExistingAIObs(sessionId, resolvedStudentName ?? null);
    }

    // Store contexto+accion+interpretacion in evidencia field (structured as JSON string)
    // retroalimentacion stays in its own field
    const evidenciaStored = JSON.stringify({
      contexto: cai.contexto,
      accion: cai.accion,
      interpretacion: cai.interpretacion,
    });

    const [userObs, aiObs] = await Promise.all([
      insertUserObservation({ sessionId, text, studentName: resolvedStudentName }),
      upsertAIObservation({
        sessionId,
        evidencia: evidenciaStored,
        retroalimentacion: cai.retroalimentacion,
        studentName: resolvedStudentName,
        existingId: resolvedExisting?.id,
      }),
    ]);

    const isUpdate = Boolean(resolvedExisting?.id);

    return new Response(
      JSON.stringify({
        userMessage: {
          id: userObs.id,
          type: 'user',
          text,
          studentName: resolvedStudentName,
          timestamp: formatTime(userObs.createdAt),
        },
        aiMessage: {
          id: aiObs.id,
          type: 'ai',
          cai,
          studentName: resolvedStudentName,
          timestamp: formatTime(aiObs.createdAt),
        },
        studentNameMatch: result.studentNameMatch,
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
