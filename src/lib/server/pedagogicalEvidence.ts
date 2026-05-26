import type { SessionConfig } from '../curriculum';
import { geminiGenerateJson } from './googleGemini';

const SYSTEM_PROMPT = `Eres especialista en educación inicial (Perú, CNEB).
Genera evidencia pedagógica y retroalimentación breve, cercana y accionable para el docente.
Responde JSON: { "evidencia": "...", "retroalimentacion": "..." }`;

export async function generatePedagogicalEvidence(
  session: SessionConfig,
  observationText: string,
  studentName?: string,
  source: 'text' | 'voice' = 'text',
): Promise<{ evidencia: string; retroalimentacion: string }> {
  const userPrompt = `
Sesión: ${session.titulo || session.area}
Grado: ${session.grado ?? '—'} · Sección: ${session.seccion ?? '—'}
Área: ${session.area}
Competencia: ${session.competencia}
Capacidad: ${session.capacidad}
Criterio: ${session.criterio}
Estudiante: ${studentName ?? 'grupo'}
Observación (${source}): ${observationText}`;

  const data = await geminiGenerateJson(SYSTEM_PROMPT, userPrompt);

  return {
    evidencia: String(data.evidencia ?? observationText),
    retroalimentacion: String(
      data.retroalimentacion ??
        'Amplía la observación con detalles del contexto y del niño/a.',
    ),
  };
}
