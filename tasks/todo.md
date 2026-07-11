# Obra OS — Tareas

## Fase 0 — Fundaciones ✅ (completa, en producción)

- [x] Scaffold Next.js 16 + TypeScript + Tailwind v4 (App Router, `src/`, alias `@/*`).
- [x] Esquema de datos COMPLETO como migración SQL: 20 tablas, borrado lógico, CHECKs, índices.
- [x] Roles + RLS en todas las tablas. Alta automática de profile al crear usuario.
- [x] Trigger: toda obra nueva nace con su rubro "Sin clasificar".
- [x] Auth **email + contraseña** con `@supabase/ssr` (se descartó magic-link: frágil en obra).
- [x] PWA: manifest, íconos, service worker propio + `/offline.html`.
- [x] Deploy: Vercel + Supabase cloud. Mati entra desde el celular. ✅

## Hardening + fundaciones offline (post-auditoría, 2026-07-11)

### Hecho por Claude ✅
- [x] Eliminado `/auth/callback` (open redirect + código muerto).
- [x] Quitado `maximumScale: 1` (accesibilidad/WCAG).
- [x] Security headers en `next.config.ts` (X-Frame-Options, nosniff, referrer, permissions, frame-ancestors).
- [x] `offline.html` excluido del proxy (no dispara `getUser()`).
- [x] Placeholders de rutas `/campo` y `/oficina` (split de superficies decidido: rutas separadas).
- [x] `supabase/.temp/` y `.claude/settings.local.json` fuera del tracking + `.gitignore`.
- [x] Migración `20260711000001_hardening_rls.sql`: DELETE solo admin en todo el esquema (corta
      cascadas destructivas desde campo), soft-delete filtrado en SELECT, initPlan wrapping,
      `handle_new_user` sin lógica "primer usuario = admin", vista `pedidos_materiales_campo`
      (campo no ve costos), índices parciales de filas vivas.
- [x] Migración `20260711000002_integridad.sql`: 17 índices FK, `gastos.rubro_id ON DELETE RESTRICT`,
      CHECKs (montos, rangos de fecha, etiquetas del diario), rubro sistema `es_sistema` único por obra.
- [x] Migración `20260711000003_fundaciones_offline.sql`: `updated_at` + trigger en 19 tablas,
      `captured_at`, `created_offline` unificado, fotos con `url` nullable + `estado_upload`,
      `personal.obra_id`.
- [x] `npm run typecheck` + CI de GitHub Actions (lint + typecheck + build).
- [x] Docs actualizados (README, ARCHITECTURE, CLAUDE.md): auth por contraseña, convenciones offline.
- [x] Verificado: lint, typecheck y build de producción verdes; dry-run de migraciones OK.

### Pendiente — necesita a Demian ⏳
- [ ] **`npx supabase db push`** — aplicar las 3 migraciones nuevas (dry-run ya validado).
- [ ] **[Dashboard Supabase]** Authentication → deshabilitar "Allow new users to sign up".
- [ ] **[Dashboard Supabase]** Verificar que el usuario de Mati tiene `role='admin'` en `profiles`.
- [ ] **Después del push:** `npm run gen:types` y tipar los 3 clientes de `src/lib/supabase/`
      con `<Database>` (client.ts, server.ts, middleware.ts).
- [ ] Verificar RLS con roles simulados en el SQL Editor (ver plan de la sesión 2026-07-11).
- [ ] Decidir si versionar `HANDOFF-obra-os.md` en el repo (hoy solo está en el escritorio).

### Diferido a propósito (decisiones conscientes)
- Scoping por obra (`obras_usuarios`): sin multi-obra ni usuarios campo no aporta.
- CSP estricta: frágil con Turbopack; solo `frame-ancestors 'none'` por ahora.
- `asistencias.hora_*` queda `time` sin tz: un huso, y `captured_at` da el instante real.

## Fase 1 — Núcleo de campo (tramos de captura ✅, falta desktop)
- [x] Cola offline en IndexedDB (Dexie) + chip de estado + sync al reconectar (`src/lib/offline/`).
      Idempotente (UUID cliente, upsert `do update`/`do nothing`), re-drena capturas entrantes,
      drenado ordenado por `capturado_en` (FK diario→foto).
- [x] Home HOY (`/campo`) con nav a las 4 pantallas + resumen de asistencia.
- [x] **Asistencia** (`/campo/asistencia`): 1 tap cicla presente→medio→ausente→presente, alta de
      persona con solo nombre, obra activa automática.
- [x] **Tareas** (`/campo/tareas`): slider de avance 0/25/50/75/100 → estado derivado.
- [x] **Materiales** (`/campo/materiales`): FALTA/LLEGÓ sobre `pedidos_materiales` (lee por la vista
      `pedidos_materiales_campo`, sin costos), alta con unidad validada por chips.
- [x] **Diario** (`/campo/diario`): nota de texto + foto opcional; sync en dos canales (fila JSON
      por la cola, binario como Blob en IndexedDB + uploader a Storage diferido).
- [x] Verificado en cada tramo: typecheck, lint y build verdes; cada tramo revisado por subagente.
- [ ] **[Dashboard Supabase]** Crear bucket de Storage `fotos-obra` con policies insert/select para
      `authenticated`. Sin esto, las notas del diario sincronizan pero las fotos quedan en `error`.
- [ ] **Prueba manual offline end-to-end** (DevTools offline → capturar en las 4 pantallas →
      recargar → reconectar → verificar filas en Supabase con `created_offline`/`captured_at`).
- [ ] Vistas de tabla desktop en `/oficina` para las mismas entidades (edición inline).
- [ ] Gating por rol en `/campo` y `/oficina` (cuando exista el capataz).
