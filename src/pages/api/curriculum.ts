import type { APIRoute } from 'astro';
import curriculoRaw from '../../data/curriculo.csv?raw';
import { parseCurriculumCsv } from '../../lib/curriculum';

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
