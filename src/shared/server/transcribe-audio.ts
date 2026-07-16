/**
 * Transcripción de audio usando Gemini multimodal.
 * Reemplaza Web Speech API (que requiere servidores Google externos).
 */
export async function transcribeAudioWithGemini(audioBase64: string, mimeType: string): Promise<string> {
  // Use runtime env to avoid bundling secrets into build output.
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error('Gemini no configurado.');

  const model = process.env.GEMINI_TEXT_MODEL ?? 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: 'Transcribe exactamente lo que se dice en este audio. Responde SOLO con el texto transcrito, sin explicaciones ni comillas. El idioma es español de Perú.',
            },
            {
              inline_data: {
                mime_type: mimeType,
                data: audioBase64,
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.0,
        thinkingConfig: { thinkingBudget: 0 },
      },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[transcribe] Gemini error', res.status, err);
    if (res.status === 429) {
      throw new Error(
        'El servicio de IA está muy ocupado (Límite de cuota excedido). Espera unos segundos e intenta de nuevo.',
      );
    }
    throw new Error(`Error al transcribir audio (${res.status}).`);
  }

  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };

  const transcript = json.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
  return transcript;
}
