import type { APIRoute } from 'astro';
import { transcribeAudioWithGemini } from '@/shared/server/transcribe-audio';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { audioBase64, mimeType } = body as { audioBase64?: string; mimeType?: string };

    if (!audioBase64 || !mimeType) {
      return new Response(JSON.stringify({ error: 'Falta audioBase64 o mimeType' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const transcript = await transcribeAudioWithGemini(audioBase64, mimeType);

    return new Response(JSON.stringify({ transcript }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[api/guest/transcribe]', e);
    const message = e instanceof Error ? e.message : 'Error al transcribir';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
