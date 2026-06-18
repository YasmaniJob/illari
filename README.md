# Mi Wawita — Cuaderno de Campo Digital

Asistente para docentes de educación inicial en Perú. Basado en el CNEB.

Captura observaciones pedagógicas en aula, genera evidencia y retroalimentación con IA (Google Gemini), y gestiona el registro de sesiones de aprendizaje.

---

## Stack

| Capa | |
|------|---|
| Frontend | Astro 6 + React 19 + Tailwind CSS 4 + Framer Motion |
| Backend | API routes SSR (Node standalone) |
| Base de datos | Turso (libSQL) via Drizzle ORM |
| Autenticación | better-auth (email + password) |
| IA | Google Gemini (texto + visión) |
| Guest mode | localStorage (sin cuenta) |

---

## Requisitos

- **Node.js >= 22.12.0**
- **pnpm** (gestor de paquetes)

---

## Puesta en marcha

```bash
cp .env.example .env
# Edita las variables necesarias (ver sección Variables de entorno)

pnpm install
pnpm db:push    # crea tablas en local.db o Turso
pnpm dev
```

Abre `http://localhost:4321` en el navegador.

---

## Variables de entorno

| Variable | Descripción | Requerida |
|----------|-------------|-----------|
| `TURSO_DATABASE_URL` | URL de Turso o `file:./local.db` para SQLite local | Sí |
| `TURSO_AUTH_TOKEN` | Token de autenticación Turso (omitir si local) | No |
| `BETTER_AUTH_SECRET` | Secreto de 32+ caracteres para sesiones | Sí |
| `BETTER_AUTH_URL` | URL base de la app (ej. `http://localhost:4321`) | Sí |
| `GOOGLE_GENERATIVE_AI_API_KEY` | API key de Google Gemini | Sí (para IA) |
| `GEMINI_TEXT_MODEL` | Modelo de texto Gemini (default: `gemini-2.0-flash`) | No |
| `GEMINI_VISION_MODEL` | Modelo de visión Gemini (default: `gemini-2.0-flash`) | No |

---

## Scripts

| Comando | Acción |
|---------|--------|
| `pnpm dev` | Inicia servidor de desarrollo |
| `pnpm build` | Compila para producción en `dist/` |
| `pnpm preview` | Previsualiza build local |
| `pnpm db:push` | Aplica schema Drizzle a la DB |
| `pnpm db:studio` | Abre Drizzle Studio para explorar datos |
| `pnpm test` | Ejecuta tests unitarios (Vitest) |
| `pnpm lint` | Formatea y corrige con Biome |
| `pnpm typecheck` | Verifica tipos con `astro check` |

---

## Rutas

| Ruta | Descripción |
|------|-------------|
| `/` | Dashboard — inicio con historial de sesiones |
| `/login` | Inicio de sesión / registro |
| `/onboarding` | Preparar clase: grado, estudiantes, planificación |
| `/escanear` | Escanear planificación con IA |
| `/aula` | Aula en vivo — observar y registrar evidencia |
| `/mis-pequenos` | Gestionar lista de estudiantes |

## API

| Método | Ruta | Uso |
|--------|------|-----|
| * | `/api/auth/*` | Better Auth |
| GET | `/api/me` | Usuario actual |
| GET | `/api/sessions` | Historial de sesiones |
| POST | `/api/sessions` | Crear sesión activa |
| GET | `/api/sessions/active` | Sesión en curso |
| GET | `/api/sessions/:id/observations` | Timeline de observaciones |
| POST | `/api/evidence` | Observación + respuesta IA |
| PATCH | `/api/observations/:id` | Editar evidencia/retroalimentación |
| GET | `/api/students?grado=&seccion=` | Lista por aula |
| POST | `/api/students` | Guardar listado de estudiantes |
| POST | `/api/scan-session` | Escanear planificación con IA |

---

## Estructura del proyecto

```
src/
├── components/         # UI (React + Astro)
│   ├── aula/           # Aula en vivo (chat, estudiantes, cards IA)
│   ├── auth/           # Login/registro
│   ├── dashboard/      # Página principal
│   ├── layout/         # Widgets de layout (AuthHeader)
│   ├── onboarding/     # Wizard de preparación de clase
│   ├── roster/         # Gestión de estudiantes
│   ├── scan/           # Escaneo con IA
│   └── ui/             # Primitivas compartidas
├── db/                 # Schema Drizzle + cliente Turso
├── layouts/            # Layout base (BaseLayout)
├── lib/                # Lógica de negocio
│   ├── api/            # Cliente API (auth + guest)
│   ├── guest/          # Modo invitado (localStorage)
│   ├── scan/           # Compresión, fases, catálogo
│   └── server/         # Server-only (auth, Gemini, observaciones)
├── pages/              # Rutas Astro
│   └── api/            # Endpoints REST
├── data/               # Currículo CNEB (CSV)
└── styles/             # CSS global + tema Tailwind
```

---

## Currículo

El catálogo CNEB se encuentra en `src/data/curriculo.csv` (formato plano).  
En `data/` existen versiones relacionales (`areas_curriculares_rows.csv`, etc.) no utilizadas actualmente en el código.

---

## Privacidad

- Las imágenes de planificaciones **no se persisten**: se procesan en memoria y se descartan.
- Solo se almacena en la base de datos el texto estructurado de las observaciones y la configuración de la sesión.
