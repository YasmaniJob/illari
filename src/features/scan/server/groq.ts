/**
 * Groq client — texto → JSON estructurado.
 * Usado para evidencia pedagógica en el aula (más rápido que Gemini para texto).
 * Gemini se mantiene solo para visión (escaneo de imágenes).
 */

const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const TIMEOUT_MS = 30_000;

export class GroqNotConfiguredError extends Error {
  constructor() {
    super('Configura GROQ_API_KEY en .env para usar la IA de Mi Wawita.');
    this.name = 'GroqNotConfiguredError';
  }
}

function requireApiKey(): string {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new GroqNotConfiguredError();
  return apiKey;
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function safeParseJson(raw: string, fallback: Record<string, unknown>): Record<string, unknown> {
  try {
    // Strip markdown code fences if present
    const cleaned = raw
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/i, '')
      .trim();
    const parsed = JSON.parse(cleaned);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/** Texto → JSON usando Groq (OpenAI-compatible API) */
export async function groqGenerateJson(systemPrompt: string, userPrompt: string): Promise<Record<string, unknown>> {
  const apiKey = requireApiKey();
  const model = process.env.GROQ_TEXT_MODEL ?? DEFAULT_MODEL;

  const res = await fetchWithTimeout(
    'https://api.groq.com/openai/v1/chat/completions',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        max_tokens: 2048,
        response_format: { type: 'json_object' },
      }),
    },
    TIMEOUT_MS,
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('Groq error', res.status, err);
    if (res.status === 429) {
      throw new Error('El servicio de IA está ocupado. Espera unos segundos e intenta de nuevo.');
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error('La clave de API de Groq no es válida.');
    }
    throw new Error(`Error al consultar la IA (${res.status}). Intenta de nuevo.`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = json.choices?.[0]?.message?.content ?? '{}';
  return safeParseJson(raw, {});
}
