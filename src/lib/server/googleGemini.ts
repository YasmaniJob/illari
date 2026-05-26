const DEFAULT_TEXT_MODEL = 'gemini-2.0-flash';
const DEFAULT_VISION_MODEL = 'gemini-2.0-flash';

export class GeminiNotConfiguredError extends Error {
  constructor() {
    super('Configura GOOGLE_GENERATIVE_AI_API_KEY en .env para usar la IA de Illari.');
    this.name = 'GeminiNotConfiguredError';
  }
}

function requireApiKey(): string {
  const apiKey = import.meta.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new GeminiNotConfiguredError();
  return apiKey;
}

function modelUrl(model: string, apiKey: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
}

function extractText(json: GeminiResponse): string {
  const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
  return text
    .replace(/^```json\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

function safeParseJson(raw: string, fallback: Record<string, unknown>): Record<string, unknown> {
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/** Texto → JSON (evidencia pedagógica, etc.) */
export async function geminiGenerateJson(systemPrompt: string, userPrompt: string): Promise<Record<string, unknown>> {
  const apiKey = requireApiKey();
  const model = import.meta.env.GEMINI_TEXT_MODEL ?? DEFAULT_TEXT_MODEL;
  const res = await fetch(modelUrl(model, apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Gemini error', err);
    throw new Error('Error al consultar Google Gemini');
  }

  const json = (await res.json()) as GeminiResponse;
  const raw = extractText(json);
  return safeParseJson(raw, {});
}

/** Imagen + prompt → JSON (escaneo de planificación) */
export async function geminiVisionJson(
  prompt: string,
  imageBase64: string,
  mimeType: string,
): Promise<Record<string, unknown>> {
  const apiKey = requireApiKey();
  const model = import.meta.env.GEMINI_VISION_MODEL ?? DEFAULT_VISION_MODEL;
  const res = await fetch(modelUrl(model, apiKey), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }, { inline_data: { mime_type: mimeType, data: imageBase64 } }],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Gemini vision error', err);
    throw new Error('No se pudo leer la imagen con Gemini');
  }

  const json = (await res.json()) as GeminiResponse;
  const raw = extractText(json);
  return safeParseJson(raw, {});
}
