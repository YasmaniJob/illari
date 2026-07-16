import type { APIRoute } from 'astro';
import { auth } from '@/features/auth/server/auth';

export const prerender = false;

export const ALL: APIRoute = (ctx) => auth.handler(ctx.request);
