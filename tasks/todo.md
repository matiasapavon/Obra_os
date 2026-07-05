# Obra OS — Tareas

## Fase 0 — Fundaciones

### Hecho por Claude (código, local) ✅
- [x] Scaffold Next.js 16 + TypeScript + Tailwind v4 (App Router, `src/`, alias `@/*`).
- [x] Esquema de datos COMPLETO como migración SQL (`supabase/migrations/`): 20 tablas del
      handoff §4 + `profiles`, borrado lógico, CHECKs de estado, índices.
- [x] Roles + RLS en todas las tablas. Trigger: primer usuario = admin; alta automática de profile.
- [x] Trigger: toda obra nueva nace con su rubro "Sin clasificar".
- [x] Auth magic-link con `@supabase/ssr` (client/server + `proxy.ts` de refresh de sesión).
- [x] Pantalla `/login`, callback `/auth/callback` (PKCE + token_hash), layout `(app)` con guard.
- [x] PWA: `manifest.webmanifest`, íconos generados, service worker propio + `/offline.html`.
- [x] Convenciones globales: `format.ts` (es-AR) y semántica de color en `globals.css`.
- [x] `README.md`, `ARCHITECTURE.md`, `.env.example`.
- [x] Build de producción verde (Turbopack). `/login` prerenderiza OK, TypeScript pasa.

### Pendiente — necesita a Demian (cuentas + OAuth, no automatizable desde acá) ⏳
- [ ] Crear cuenta + proyecto en Supabase (plan free). Copiar URL + anon key.
- [ ] Pegar las keys en `.env.local` (y luego en Vercel).
- [ ] `npx supabase login` (OAuth) → `npx supabase link --project-ref <ref>` → `npx supabase db push`.
- [ ] (Opcional) Activar el custom access token hook en Dashboard → Auth → Hooks
      (`public.custom_access_token_hook`). Sin esto igual funciona (fallback a profiles.role).
- [ ] Verificar en Auth → Providers que Email (magic link) esté habilitado.
- [ ] Crear cuenta Vercel → `npx vercel` → cargar las env vars → deploy.

### Criterio de salida (gate para Fase 1)
- [ ] Mati abre la URL en el celular, se loguea por magic-link, e instala la app en la pantalla
      de inicio como ícono.

## Fase 1 — Núcleo de campo (siguiente)
- [ ] Pantalla HOY (home mobile) + flujo de asistencia (arrancar por acá — hábito diario).
- [ ] Cola offline en IndexedDB (Dexie) + indicador de "cargas pendientes" + sync al reconectar.
- [ ] Tareas del día (avance con slider), materiales (FALTA/LLEGÓ), nota + foto al diario.
- [ ] Vistas de tabla desktop para las mismas entidades (edición inline).
