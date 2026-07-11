# Fase 1 — Kickoff (arrancar acá en sesión nueva)

> Punto de partida acordado el 2026-07-11. Fase 0 + hardening están cerrados y
> commiteados en `main`. Lo que sigue es la **Fase 1 — Núcleo de campo**.

## Primer paso: brainstorm del flujo de ASISTENCIA

El diseño manda arrancar por asistencia ("es el hábito diario"). **No codear todavía**:
primero diseñar el flujo con la skill de brainstorming. Preguntas a resolver antes de tocar código:

- **¿Quiénes aparecen para marcar asistencia?** `personal` ahora tiene `obra_id` (lo agregó la
  migración `20260711000003`). ¿La lista de "hoy en la obra" sale de `personal where obra_id = obra_activa`?
  ¿Cómo se da de alta una persona la primera vez sin fricción?
- **¿Cuál es el gesto de marcar?** Objetivo: ≤3 toques. ¿Un tap por persona (presente/ausente)?
  ¿medio día con un segundo tap? ¿hora_entrada/hora_salida se piden o se infieren de `captured_at`?
- **¿Cómo se ve la cola offline?** Indicador de "N cargas pendientes", estado sincronizando, qué
  pasa si Mati marca sin señal y cierra la app.
- **¿Obra activa?** No hay selector todavía. Con una sola obra, ¿se toma la única obra activa
  automáticamente y se difiere el selector? (recomendado para no complicar Fase 1).

## Contexto ya resuelto (no re-decidir)

- **Split de superficies:** rutas separadas. Asistencia vive en `/campo` (placeholder ya creado en
  `src/app/(app)/campo/page.tsx`). La plata nunca aparece en mobile.
- **Cola offline (convención en `ARCHITECTURE.md`):** el cliente Dexie genera el UUID del PK al
  capturar y sincroniza con `upsert on conflict (id) do nothing` → reintento idempotente, sin
  duplicados. `updated_at` (trigger) para sync incremental; `captured_at` para el instante real de
  captura; `created_offline = true` marca lo que entró por la cola.
- **Lib de offline:** Dexie (IndexedDB). Es la única dependencia nueva prevista para Fase 1.
- **Principios:** ≤3 toques, botones ≥48px, alto contraste, cero dropdowns anidados en mobile,
  es-AR ("vos"), semántica de color fija (`globals.css`).

## Esquema relevante para asistencia

- `asistencias`: `obra_id, personal_id, fecha (default current_date), hora_entrada/salida (time),
  medio_dia (bool), observacion, created_offline, captured_at, updated_at, deleted_at`.
- `personal`: `nombre, rol, gremio_id, obra_id (nuevo), telefono, art_vencimiento, seguro_vencimiento`.
- RLS: asistencias es tabla compartida — campo puede insert/update, DELETE solo admin, SELECT filtra
  `deleted_at is null`. Ya está tipada en `src/lib/supabase/database.types.ts`.

## Resto de Fase 1 (después de asistencia)

Pantalla HOY (home de `/campo`) · tareas del día (avance con slider) · materiales FALTA/LLEGÓ
(definir si escribe `stock_eventos` o `pedidos_materiales` — hay dos modelos solapados, resolver en
su brainstorm) · nota + foto al diario (`diario_obra` + `fotos`, con `estado_upload` para diferir
el binario) · vistas de tabla en `/oficina` con edición inline.

## Pendientes operativos heredados

- `git push` de los 2 commits de hardening (dispara deploy en Vercel) — el usuario decide cuándo.
- (Opcional) verificar RLS con roles simulados en el SQL Editor antes de pushear.
