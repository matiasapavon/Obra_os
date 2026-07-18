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
- [x] **`npx supabase db push`** — las 3 de hardening ya estaban aplicadas en el remoto pero sin
      registrar; se reconciliaron con `migration repair` y se aplicó la 004 (multi-obra). Historial
      remoto ahora al día (2026-07-11).
- [x] **`npm run gen:types`** — regenerado; incluye `obras_usuarios`.
- [x] **[Dashboard Supabase]** Authentication → "Allow new users to sign up" deshabilitado (2026-07-17).
- [x] **[Dashboard Supabase]** Usuario de Mati (`matias.a.pavon`) es admin — verificado en la
      práctica: el export API (admin-only) le responde (2026-07-17).
- [ ] Tipar los 3 clientes de `src/lib/supabase/` con `<Database>` (client.ts, server.ts,
      middleware.ts) — opcional, mejora el tipado end-to-end.
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
- [x] **[Dashboard Supabase]** Bucket de Storage `fotos-obra` creado. El toggle "Public bucket"
      estaba apagado (la URL pública daba "Bucket not found"); Demian lo activó 2026-07-17 y la
      URL pública responde 200 image/jpeg.
- [x] **Prueba manual offline end-to-end** (2026-07-17, simulada en navegador: override de
      `navigator.onLine` + bloqueo de fetch a Supabase). Las 4 pantallas de campo pasaron:
      asistencia (persona nueva + presente), tareas (slider 50% → en_curso), materiales
      (material nuevo + pedido FALTA), diario (nota + foto). Cola persistió en IndexedDB,
      drenó al reconectar, filas en Supabase con `created_offline`/`captured_at`, foto
      comprimida (60→34 KB) subida a Storage y accesible por URL pública. Datos de prueba en
      la obra "Obra de prueba (test offline)" — limpiar con soft-delete cuando ya no sirvan.
- [x] Vistas de tabla desktop en `/oficina` (tareas, materiales+pedidos con costos, personal,
      asistencias, diario) con edición inline vía server action + allow-list. Gate admin en el
      layout de `/oficina`. Patrón reutilizable `TablaOficina`/`CeldaEditable`/`BadgeEstado`.
- [ ] Gating por rol en `/campo` (diferido: sin capataz no urge; `/oficina` ya está gateado).
- [ ] Alta de filas desde `/oficina` (personal/tareas) — hoy solo edición inline de lo existente.

## Fase 2 — Economía / plata ✅ (solo desktop admin, 2026-07-11)
- [x] Allow-list `EDITABLES` ampliada (rubros, gastos, compromisos, ingresos, adicionales,
      vencimientos_admin) + 6 tabs nuevas en `OficinaNav`.
- [x] **Rubros** (`/oficina/rubros`): presupuesto editable + gastado por rubro + saldo (rojo si
      negativo). El rubro de sistema "Sin clasificar" no permite renombrar.
- [x] **Gastos** (`/oficina/gastos`): imputación a rubro (select de rubros de la obra), monto,
      moneda, tipo, medio de pago, comprobante, total visible arriba.
- [x] **Compromisos, ingresos, adicionales, vencimientos** con el mismo patrón
      (`TablaOficina`/`CeldaEditable`). Vencimientos pendientes ya pasados en rojo.
- [x] Typecheck, lint y build verdes. Commit por entidad.
- [ ] UI para linkear `pedidos_materiales.gasto_id` → gasto (el puente existe en el esquema;
      falta decidir la interacción — probablemente un botón "crear gasto desde pedido").
- [ ] Alta de filas de plata desde `/oficina` (hoy solo edición inline, igual que Fase 1).

## Fase 3 — Cronograma + alertas ✅ (2026-07-11)
- [x] **Etapas** (`/oficina/etapas`): tabla editable (orden, nombre, estado, fechas plan/real).
- [x] **Alertas** (`/oficina/alertas`): vista calculada al momento — vencimientos admin vencidos
      o en ventana de aviso, ART/seguro de personal (ventana 30 días), pedidos FALTANTE,
      tareas bloqueadas. Rojas primero, sin tabla de avisos persistida (simplicidad).
- [ ] UI de dependencias entre tareas (esquema `dependencias_tareas` existe; diferido hasta
      que haya cronograma real cargado).

## Fase 4 — Dashboards ✅ (2026-07-11)
- [x] **Resumen** (`/oficina/resumen`, ahora la pestaña de entrada): avance de obra (promedio
      de tareas), caja (ingresos − gastos), gastado vs presupuesto total, barras de plata por
      rubro (rojo si pasado), asistencia últimos 7 días en jornales. Barras CSS puras, sin
      librería de charts.

## Fase 5 — API export ✅ (2026-07-11)
- [x] `GET /api/export/[tabla]` (JSON) y `?formato=csv` — allow-list de 14 tablas, admin-only,
      filtro opcional `?obra=<uuid>`. Tablas/columnas en español, listo para Cowork.

## Fase 6 — Pulido (parcial)
- [x] Compresión de fotos en el cliente antes de guardar/subir (JPEG, lado ≤1600px, calidad
      0,8; best-effort, ante fallo sube la original). `src/lib/offline/comprimir.ts`.
- [x] Multi-obra: migración `obras_usuarios` aplicada + **selector de obra** en el header de
      `/oficina`. `obraActiva` resuelve por cookie (fallback a la obra activa); server action
      admin-only fija la obra en foco y revalida. El selector aparece solo con >1 obra viva.
- [x] Compresión de fotos en el cliente (arriba).
- [ ] Backups — **decisión: dejar los backups automáticos de Supabase** (diarios en el plan pago;
      alcanzan para esta escala). Sin código. Revisar si se sube de plan/escala.

### Diferido consciente de multi-obra
- Alta de obras y asignación de gente (`obras_usuarios`) desde la UI: hoy el selector lista todas
  las obras vivas (admin las ve por RLS); crear obras y asignar campo se hace por SQL/Dashboard
  hasta que haga falta una pantalla.
- Scoping de campo por `obras_usuarios`: el selector es solo de oficina; campo sigue capturando
  contra su obra. Enganchar cuando exista un capataz con varias obras.
