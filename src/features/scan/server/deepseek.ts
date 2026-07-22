/**
 * DeepSeek client — texto → JSON estructurado.
 * Es la IA principal del proyecto (API de pago de alta precisión y velocidad).
 * Soporta API compatible con OpenAI (https://api.deepseek.com/chat/completions).
 */

import { groqGenerateJson } from './groq';
import { geminiGenerateJson } from './googleGemini';

const DEFAULT_MODEL = 'deepseek-chat';
const TIMEOUT_MS = 30_000;

export class DeepSeekNotConfiguredError extends Error {
  constructor() {
    super('Configura DEEPSEEK_API_KEY en .env para usar la IA principal.');
    this.name = 'DeepSeekNotConfiguredError';
  }
}

function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function safeParseJson(raw: string, fallback: Record<string, unknown>): Record<string, unknown> {
  try {
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

/**
 * Genera JSON estructurado utilizando DeepSeek como IA principal.
 * Si DEEPSEEK_API_KEY falla o no está presente, hace fallback automáticamente a Groq / Gemini.
 */
export async function deepseekGenerateJson(
  systemPrompt: string,
  userPrompt: string,
): Promise<Record<string, unknown>> {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    console.warn('[DeepSeek] DEEPSEEK_API_KEY no configurada. Ejecutando fallback...');
    return fallbackGenerateJson(systemPrompt, userPrompt);
  }

  const model = process.env.DEEPSEEK_MODEL ?? DEFAULT_MODEL;

  try {
    const res = await fetchWithTimeout(
      'https://api.deepseek.com/chat/completions',
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
      console.error('[DeepSeek] API error:', res.status, err);
      return fallbackGenerateJson(systemPrompt, userPrompt);
    }

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const raw = json.choices?.[0]?.message?.content ?? '{}';
    return safeParseJson(raw, {});
  } catch (err) {
    console.error('[DeepSeek] Error al conectar con DeepSeek:', err);
    return fallbackGenerateJson(systemPrompt, userPrompt);
  }
}

async function fallbackGenerateJson(
  systemPrompt: string,
  userPrompt: string,
): Promise<Record<string, unknown>> {
  if (process.env.GROQ_API_KEY) {
    return groqGenerateJson(systemPrompt, userPrompt);
  }
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return geminiGenerateJson(systemPrompt, userPrompt);
  }
  throw new Error('No hay ninguna API key de IA configurada.');
}
