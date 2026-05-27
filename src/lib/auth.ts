import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, schema } from '../db';

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
  secret: process.env.BETTER_AUTH_SECRET ?? 'dev-only-change-me-minimum-32-characters-long',
});

export type AuthSession = typeof auth.$Infer.Session;
