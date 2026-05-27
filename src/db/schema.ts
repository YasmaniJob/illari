import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

/** Tablas Better Auth */
export const user = sqliteTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull(),
  image: text('image'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const session = sqliteTable('session', {
  id: text('id').primaryKey(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
});

export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
  scope: text('scope'),
  password: text('password'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }),
});

/** Sesiones de aula (Illari) */
export const classSessions = sqliteTable(
  'class_sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    titulo: text('titulo'),
    grado: text('grado'),
    seccion: text('seccion'),
    area: text('area').notNull(),
    competencia: text('competencia').notNull(),
    capacidad: text('capacidad').notNull(),
    criterio: text('criterio').notNull(),
    proposito: text('proposito').notNull().default(''),
    status: text('status', { enum: ['active', 'completed'] }).notNull(),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_sessions_user_id').on(table.userId),
    // Composite index for getActiveSessionForUser (userId + status filter)
    index('idx_sessions_user_status').on(table.userId, table.status),
  ],
);

export const students = sqliteTable(
  'students',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id),
    grado: text('grado').notNull(),
    seccion: text('seccion').notNull(),
    name: text('name').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
  },
  (table) => [index('idx_students_aula').on(table.userId, table.grado, table.seccion)],
);

export const observations = sqliteTable(
  'observations',
  {
    id: text('id').primaryKey(),
    sessionId: text('session_id')
      .notNull()
      .references(() => classSessions.id),
    type: text('type', { enum: ['user', 'ai'] }).notNull(),
    text: text('text'),
    evidencia: text('evidencia'),
    retroalimentacion: text('retroalimentacion'),
    studentName: text('student_name'),
    createdAt: text('created_at').notNull(),
  },
  (table) => [
    index('idx_obs_session_id').on(table.sessionId),
    // Composite index for listObservations ordered scan (sessionId + createdAt)
    index('idx_obs_session_created').on(table.sessionId, table.createdAt),
  ],
);
