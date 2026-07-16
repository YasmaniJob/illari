import type { APIRoute } from 'astro';
import { parseCurriculumCsv } from '@/features/curriculum/curriculum';
import curriculoRaw from '@/features/curriculum/data/curriculo.csv?raw';

export const prerender = false;

// Parse once at module load
const curriculum = parseCurriculumCsv(curriculoRaw);

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ curriculum }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
