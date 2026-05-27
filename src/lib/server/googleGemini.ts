const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash';
const DEFAULT_VISION_MODEL = 'gemini-2.5-flash';

const TIMEOUT_TEXT_MS = 30_000;
const TIMEOUT_VISION_MS = 60_000;

export class GeminiNotConfiguredError extends Error {
  constructor() {
    super('Configura GOOGLE_GENERATIVE_AI_API_KEY en .env para usar la IA de Illari.');
    this.name = 'GeminiNotConfiguredError';
  }
}

function requireApiKey(): string {
  // Use runtime env to avoid bundling secrets into build output.
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new GeminiNotConfiguredError();
  return apiKey;
}

function modelUrl(model: string, apiKey: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
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
  const model = process.env.GEMINI_TEXT_MODEL ?? DEFAULT_TEXT_MODEL;
  const res = await fetchWithTimeout(
    modelUrl(model, apiKey),
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2,
          // Disable thinking for faster responses in real-time classroom use
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    },
    TIMEOUT_TEXT_MS,
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('Gemini error', res.status, err);
    if (res.status === 429) {
      throw new Error('El servicio de IA está ocupado en este momento. Espera unos segundos e intenta de nuevo.');
    }
    if (res.status === 403 || res.status === 401) {
      throw new Error('La clave de API de Gemini no es válida o no tiene permisos.');
    }
    throw new Error(`Error al consultar la IA (${res.status}). Intenta de nuevo.`);
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
  const model = process.env.GEMINI_VISION_MODEL ?? DEFAULT_VISION_MODEL;
  const res = await fetchWithTimeout(
    modelUrl(model, apiKey),
    {
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
          // Disable thinking for faster scan responses
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    },
    TIMEOUT_VISION_MS,
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('Gemini vision error', res.status, err);
    if (res.status === 429) {
      throw new Error('El servicio de IA está ocupado. Espera unos segundos e intenta de nuevo.');
    }
    throw new Error(`No se pudo leer la imagen con Gemini (${res.status}).`);
  }

  const json = (await res.json()) as GeminiResponse;
  const raw = extractText(json);
  return safeParseJson(raw, {});
}
