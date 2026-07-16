import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, schema } from '@/shared/server/db';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'sqlite',
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
  },
  // Use runtime env to avoid bundling secrets into build output.
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:4321',
  secret: (() => {
    const s = process.env.BETTER_AUTH_SECRET;
    if (!s && process.env.NODE_ENV === 'production') {
      throw new Error('La variable de entorno BETTER_AUTH_SECRET no está configurada en producción.');
    }
    return s ?? 'dev-only-change-me-minimum-32-characters-long';
  })(),
});

export type AuthSession = typeof auth.$Infer.Session;
