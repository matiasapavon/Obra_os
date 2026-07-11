# Obra OS

Sistema de gestión de obra para Mati (arquitecto/constructor, Argentina). Dos superficies sobre
un mismo backend: **app de campo** (celular, PWA, carga ultrarrápida y offline) y **app de gestión**
(PC: economía, cronograma, dashboards). La inteligencia y el análisis viven arriba, en Claude Cowork,
leyendo los datos por API.

> Estado: **Fase 0 (Fundaciones) completa.** Ver `tasks/todo.md` para el detalle y lo que sigue.

## Stack

- **Next.js 16 (App Router) + TypeScript + Tailwind v4** — un codebase responsive (mobile + desktop).
- **Supabase** — Postgres + Auth (email + contraseña) + Storage + API REST (PostgREST).
- **PWA** — instalable en el celular; service worker propio (`public/sw.js`) para shell offline.
- **Deploy** — Vercel (frontend) + Supabase cloud. Todo en planes gratuitos.

## Correr en local

1. **Instalar dependencias**
   ```bash
   npm install
   ```
2. **Variables de entorno.** Copiá `.env.example` a `.env.local` y completá con tu proyecto Supabase
   (Project Settings → API):
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu-anon-key-publica
   ```
3. **Levantar el dev server** (Turbopack):
   ```bash
   npm run dev        # http://localhost:3000
   ```

## Scripts

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo (Turbopack). El service worker se desactiva en dev. |
| `npm run build` | Build de producción. |
| `npm start` | Sirve el build de producción (para probar la PWA/offline en local). |
| `npm run lint` | ESLint. |
| `npm run typecheck` | TypeScript sin emitir (`tsc --noEmit`). |
| `npm run gen:types` | Regenera `src/lib/supabase/database.types.ts` desde la base linkeada. |
| `node scripts/generate-icons.mjs` | Regenera los íconos PWA. |

## Base de datos (Supabase)

El esquema completo vive versionado como migraciones SQL en `supabase/migrations/`.

```bash
npx supabase login                          # OAuth, una vez
npx supabase link --project-ref <TU-REF>    # linkear al proyecto cloud
npx supabase db push                        # aplica las migraciones a la nube
```

- Roles: `admin` (Mati, acceso total) y `campo` (capataz futuro, sin datos económicos).
- **El signup público está deshabilitado.** Los usuarios se crean a mano en el Dashboard
  (Authentication → Users, con "Auto Confirm"); nacen con rol `campo` y se promueven por SQL:
  `update profiles set role = 'admin' where id = '<uuid>'`.
- RLS activado en todas las tablas. El DELETE físico es solo-admin en todo el esquema
  (lo normal es soft-delete vía `deleted_at`).

## Deploy (Vercel)

```bash
npx vercel            # login + primer deploy (seguí las instrucciones)
npx vercel --prod     # deploy a producción
```

Cargá `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` en
Vercel → Project → Settings → Environment Variables.

## Límites de los planes gratuitos

- **Supabase Storage: ~1 GB.** Cuando entren las fotos (Fase 1/6), se comprimen en el navegador a
  ~200 KB antes de subir (`browser-image-compression`) para estirar el plan gratuito.
- Postgres free alcanza para varias obras simultáneas.

## Documentación

- `ARCHITECTURE.md` — decisiones de arquitectura y modelo de datos.
- `HANDOFF-obra-os.md` (en el escritorio de Demian) — el diseño completo por fases.
- `tasks/todo.md` — estado y próximos pasos.
