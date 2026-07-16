import type { APIRoute } from 'astro';
import { parseCurriculumCsv } from '@/features/curriculum/curriculum';
import { type ExtractedScanFields, matchScanToCurriculum } from '@/features/curriculum/curriculumMatch';
import curriculoRaw from '@/features/curriculum/data/curriculo.csv?raw';
import { buildCatalogPromptAppendix } from '@/features/scan/client/lib/catalog';
import { GeminiNotConfiguredError, geminiVisionJson } from '@/features/scan/server/googleGemini';
import { GRADOS, SECCIONES } from '@/shared/client/classroom';
import { requireUser, unauthorizedResponse } from '@/shared/server/auth-middleware';

export const prerender = false;

const curriculum = parseCurriculumCsv(curriculoRaw);
const CATALOG_APPENDIX = buildCatalogPromptAppendix(curriculum);

const EXTRACT_PROMPT = `Eres asistente para docentes de educación inicial en Perú.
Analiza la imagen de una planificación o sesión de aprendizaje.
Extrae SOLO texto visible. Responde JSON válido sin markdown:
{
  "titulo": "título o tema de la sesión",
  "grado": "ej. 1 año, 2 años, 3 años, 4 años, 5 años",
  "seccion": "ej. A, B, C o Única",
  "area": "área curricular si aparece",
  "competencia": "competencia CNEB si aparece",
  "capacidad": "capacidad si aparece",
  "criterio": "criterio o desempeño/indicador de evaluación"
}
Usa cadena vacía si no encuentras el campo.
${CATALOG_APPENDIX}`;

async function extractWithVision(imageBase64: string, mimeType: string): Promise<ExtractedScanFields> {
  const data = await geminiVisionJson(EXTRACT_PROMPT, imageBase64, mimeType);

  return {
    titulo: String(data.titulo ?? ''),
    grado: String(data.grado ?? ''),
    seccion: String(data.seccion ?? ''),
    area: String(data.area ?? ''),
    competencia: String(data.competencia ?? ''),
    capacidad: String(data.capacidad ?? ''),
    criterio: String(data.criterio ?? ''),
  };
}

export const POST: APIRoute = async ({ request }) => {
  const user = await requireUser(request);
  if (!user) return unauthorizedResponse();

  try {
    let body: any;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'JSON malformado' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const imageBase64 = body?.imageBase64 as string | undefined;
    const mimeType = (body?.mimeType as string) || 'image/jpeg';

    const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      return new Response(
        JSON.stringify({
          error: `Tipo de archivo no permitido: ${mimeType}. Solo se admiten: ${ALLOWED_MIME_TYPES.join(', ')}`,
        }),
        {
          status: 415,
          headers: { 'Content-Type': 'application/json' },
        },
      );
    }

    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return new Response(JSON.stringify({ error: 'Imagen requerida' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (imageBase64.length > 6_000_000) {
      return new Response(JSON.stringify({ error: 'Imagen demasiado grande' }), {
        status: 413,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const extracted = await extractWithVision(imageBase64, mimeType);
    const matched = matchScanToCurriculum(extracted, curriculum, [...GRADOS], [...SECCIONES]);

    return new Response(
      JSON.stringify({
        extracted,
        matched,
        mode: 'vision',
        privacy: 'Imagen procesada en memoria y descartada. No se almacena.',
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    console.error(e);
    if (e instanceof GeminiNotConfiguredError) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const message = e instanceof Error ? e.message : 'Error al analizar la imagen';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
