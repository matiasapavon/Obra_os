# Spec — Asistencia + cola offline (Fase 1, tramo 1)

> Aprobado por Demian el 2026-07-11. Contexto de partida: `tasks/fase1-kickoff.md`.

## Objetivo

Primer flujo real de campo: marcar asistencia diaria desde el celular, funcionando sin señal,
con sync automático al reconectar. Sienta la infraestructura offline que reutilizarán tareas,
materiales y diario.

## Decisiones (cerradas)

- **Gesto:** 1 tap en la tarjeta de la persona cicla `presente → medio día → ausente → presente`.
  "Sin marcar" es solo el estado inicial pre-tap (no se vuelve a él por tap: los 3 estados con
  fila —presente/medio/ausente— tienen representación persistida distinta y round-trippean bien;
  volver a "sin marcar" chocaría con "ausente" porque ambos usarían `deleted_at`).
  No se piden horas: `captured_at` registra el instante.
- **Persistencia de estados:** presente y medio día son filas vivas en `asistencias`
  (`medio_dia` bool, `deleted_at is null`); ausente es la misma fila soft-borrada (`deleted_at`
  seteado, reutilizando el id). Las tres representaciones son distintas, así que el ciclo
  round-trippea sin ambigüedad. Corregir un tap reutiliza el mismo id — ver "Corrección de taps".
- **Alta de personal desde mobile:** botón `+ Persona`, sheet con nombre (rol opcional), inserta
  en `personal` con `obra_id` de la obra activa vía la cola. Datos finos se completan en `/oficina`.
- **Obra activa:** se toma automáticamente la única obra con estado activo. Sin selector en Fase 1.
- **Indicador offline:** chip en el header de `/campo`: verde "Sincronizado", amarillo
  "N pendientes", gris "Sin señal". Sin pantalla de detalle.
- **Dependencias nuevas:** `dexie` y `dexie-react-hooks`. Nada más.

## Arquitectura offline (`src/lib/offline/`)

- **`db.ts`** — esquema Dexie:
  - `cola`: `{ id (uuid PK, generado con crypto.randomUUID()), tabla, op ('upsert'), payload,
    estado ('pendiente'|'error'), error_msg?, capturado_en }`.
  - Espejo de lectura para offline: `personal` (de la obra activa) y `asistencias_hoy`.
- **`sync.ts`** —
  - `encolar(tabla, payload)`: escribe en Dexie (cola + espejo) y dispara `sincronizar()` si hay red.
  - `sincronizar()`: por cada ítem pendiente hace upsert a Supabase; éxito → borra de la cola;
    error de servidor/RLS → marca `estado: 'error'` y no reintenta en loop.
  - Triggers de reintento: evento `online`, `visibilitychange` (vuelta a foco), y post-captura.
- **`useCola.ts`** — hook cliente: `{ pendientes, errores, online }` reactivo con `liveQuery`.

### Corrección de taps (idempotencia con update)

El UUID de la fila de asistencia se genera en el primer tap y se conserva en el espejo local
(clave `personal_id + fecha`). Taps siguientes re-encolan el **mismo id** con el payload nuevo.
Por eso asistencias sincroniza con `upsert ... on conflict (id) do update` (vía
`.upsert(payload)` de supabase-js). Ausente re-usa el mismo id con `deleted_at` seteado
(soft-delete: campo tiene UPDATE, no DELETE). Inserts puros (personal) usan
`ignoreDuplicates: true` (`do nothing`).

## UI

### `/campo/asistencia`

- Server component: resuelve obra activa + personal (`obra_id = obra activa`, `deleted_at is null`)
  y asistencias de hoy; los pasa al cliente, que los espeja en Dexie.
- Cliente: lista de tarjetas ≥48px de alto, alto contraste, color semántico de `globals.css` +
  etiqueta de texto del estado (gris=pendiente, verde=presente, amarillo=medio día, rojo=ausente).
- Header: título "Asistencia — {fecha es-AR}" + chip de sync + botón `+ Persona`.
- Sin señal: la pantalla se hidrata del espejo Dexie y todo sigue funcionando.

### `/campo` (home HOY, versión mínima de este tramo)

- Primera sección: card grande "Asistencia" con resumen (X presentes de N) que navega a
  `/campo/asistencia`. El resto de la home llega con los tramos siguientes.

## Errores

- Ítems con `estado: 'error'` cuentan en el chip (amarillo con detalle "N con error") y se
  reintentan solo con un tap en el chip (reintento manual), no en loop.
- Si no hay obra activa: mensaje claro en `/campo` ("No hay ninguna obra activa") — no crashear.

## Verificación

- `npm run lint`, `npm run typecheck`, `npm run build` verdes.
- Manual (DevTools → Network offline): marcar asistencias y alta de persona sin señal, recargar
  la app (persisten), reconectar (chip pasa a verde) y verificar filas en Supabase con
  `created_offline = true` y `captured_at` correcto.

## Fuera de alcance de este tramo

Tareas del día, materiales, diario+foto, vistas `/oficina`, gating por rol, selector de obra,
sync incremental por `updated_at` (el espejo se refresca full en cada carga con red).
