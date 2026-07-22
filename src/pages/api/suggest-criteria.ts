import type { APIRoute } from 'astro';
import { deepseekGenerateJson } from '@/features/scan/server/deepseek';
import { requireUser, unauthorizedResponse } from '@/shared/server/auth-middleware';


export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return unauthorizedResponse();

  try {
    const body = await request.json();
    const { area, competencia, capacidades, evidencia, edad } = body;

    if (!area || !competencia) {
      return new Response(JSON.stringify({ error: 'Área y competencia son requeridas' }), { status: 400 });
    }

    const systemPrompt = `Eres un experto pedagógico en educación inicial en el marco del CNEB de Perú.
Tu tarea es sugerir criterios de evaluación concretos, observables y contextualizados para una sesión de aprendizaje en base a los datos proporcionados por la docente.

Debes proponer exactamente 3 criterios de evaluación claros, redactados en lenguaje sencillo e inicial, orientados a la edad "${edad || '3 a 5 años'}".
Los criterios deben responder a la competencia y a las capacidades seleccionadas, y tomar en cuenta la evidencia propuesta (si la hay).

Responde únicamente un JSON válido con el siguiente formato:
{
  "suggestions": [
    "Criterio sugerido 1",
    "Criterio sugerido 2",
    "Criterio sugerido 3"
  ]
}`;

    const userPrompt = `Datos de la planificación:
- Área: ${area}
- Competencia: ${competencia}
- Capacidades seleccionadas: ${Array.isArray(capacidades) ? capacidades.join(', ') : 'Ninguna'}
- Evidencia de aprendizaje: ${evidencia || 'Sin definir'}
- Edad del aula: ${edad || 'No especificada'}`;

    const data = await deepseekGenerateJson(systemPrompt, userPrompt);


    return new Response(JSON.stringify({ suggestions: data.suggestions ?? [] }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Error al sugerir criterios' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
