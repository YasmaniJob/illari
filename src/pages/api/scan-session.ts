import type { APIRoute } from 'astro';
import curriculoRaw from '../../data/curriculo.csv?raw';
import { GRADOS, SECCIONES } from '../../lib/classroom';
import { parseCurriculumCsv } from '../../lib/curriculum';
import { type ExtractedScanFields, matchScanToCurriculum } from '../../lib/curriculumMatch';
import { buildCatalogPromptAppendix } from '../../lib/scan/catalog';
import { GeminiNotConfiguredError, geminiVisionJson } from '../../lib/server/googleGemini';

export const prerender = false;

const curriculum = parseCurriculumCsv(curriculoRaw);
const CATALOG_APPENDIX = buildCatalogPromptAppendix(curriculum);

const EXTRACT_PROMPT = `Eres asistente para docentes de educación inicial en Perú.
Analiza la imagen de una planificación o sesión de aprendizaje.
Extrae SOLO texto visible. Responde JSON válido sin markdown:
{
  "titulo": "título o tema de la sesión",
  "grado": "ej. 9 meses, 18 meses, 24 meses, 36 meses, 3 años, 4 años, 5 años",
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
  try {
    const body = await request.json();
    const imageBase64 = body?.imageBase64 as string | undefined;
    const mimeType = (body?.mimeType as string) || 'image/jpeg';

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
