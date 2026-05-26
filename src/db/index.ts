import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import * as schema from './schema';

const url = import.meta.env.TURSO_DATABASE_URL ?? 'file:./local.db';
const authToken = import.meta.env.TURSO_AUTH_TOKEN;

const client = createClient(
  authToken ? { url, authToken } : { url },
);

export const db = drizzle(client, { schema });
export { schema };
