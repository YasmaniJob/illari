# Backend Mi Wawita — Drizzle, Turso, Better Auth

## Verificación (antes vs ahora)

| Requisito | Antes | Ahora |
|-----------|-------|-------|
| Sesiones en Turso | `localStorage` | `class_sessions` + API `/api/sessions` |
| Auth en rutas protegidas | No | Better Auth + `src/middleware.ts` |
| IA en aula simulada | `setTimeout` | `POST /api/evidence` (Google Gemini) |
| Estudiantes mock | `MOCK_STUDENTS` / seed automático | Turso `students` + registro real en onboarding o `/mis-pequenos` |

## Puesta en marcha

```bash
cp .env.example .env
# Edita BETTER_AUTH_SECRET (32+ caracteres)

pnpm db:push    # crea tablas en local.db o Turso
pnpm dev
```

1. Abre `/login` → **Crear cuenta** (email + contraseña).
2. **Preparar clase** o **Escanear** (requiere sesión iniciada).
3. **Aula** — observaciones y evidencia IA se guardan en `observations`.

## Rutas protegidas

- `/onboarding`
- `/escanear`
- `/aula`

Redirigen a `/login?redirect=...` si no hay cookie de sesión.

## API

| Método | Ruta | Uso |
|--------|------|-----|
| * | `/api/auth/*` | Better Auth |
| GET | `/api/sessions` | Historial |
| POST | `/api/sessions` | Nueva sesión activa |
| GET | `/api/sessions/active` | Sesión en curso |
| GET | `/api/sessions/:id/observations` | Timeline |
| POST | `/api/evidence` | Observación + respuesta IA |
| PATCH | `/api/observations/:id` | Editar evidencia/retroalimentación |
| GET | `/api/students?grado=&seccion=` | Lista por aula |
| POST | `/api/students` | Guardar listado real `{ grado, seccion, names[] }` |

## Variables de entorno

- `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` — base remota Turso
- `GOOGLE_GENERATIVE_AI_API_KEY` — escaneo (`/api/scan-session`) y evidencia en aula
- `BETTER_AUTH_SECRET` + `BETTER_AUTH_URL`

## Privacidad escaneo

El escaneo sigue sin guardar imágenes; solo texto estructurado en sesión.
