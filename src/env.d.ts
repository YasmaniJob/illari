/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    user: import('@/features/auth/server/auth').AuthSession['user'] | null;
    session: import('@/features/auth/server/auth').AuthSession['session'] | null;
  }
}

interface ImportMetaEnv {
  readonly TURSO_DATABASE_URL?: string;
  readonly TURSO_AUTH_TOKEN?: string;
  readonly BETTER_AUTH_SECRET?: string;
  readonly BETTER_AUTH_URL?: string;
  readonly GOOGLE_GENERATIVE_AI_API_KEY?: string;
  readonly GEMINI_TEXT_MODEL?: string;
  readonly GEMINI_VISION_MODEL?: string;
  readonly PUBLIC_APP_URL?: string;
}
