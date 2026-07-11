# Arquitectura — Obra OS

Resumen de las decisiones tomadas. El diseño completo por fases está en `HANDOFF-obra-os.md`.

## Principios innegociables (del handoff §2)

1. **Tac-tac-tac en campo:** ninguna carga de campo supera 3 toques + texto/foto opcional. Botones
   grandes (≥48px), alto contraste, tipografía grande.
2. **Offline-first en campo:** toda carga funciona sin señal y sincroniza al volver (Fase 1).
3. **La plata solo en oficina (desktop):** el mobile nunca pide ni muestra dinero.
4. **Cada dato se carga una sola vez.**
5. **Todo gasto se imputa a un rubro** (default "Sin clasificar", en rojo hasta reclasificar).
6. **Datos accesibles por API** para Cowork (requisito desde el día 1).
7. **Español rioplatense** en toda la UI ("vos").
8. **Simplicidad de mantenimiento:** menos dependencias, menos magia (lo mantiene Demian vía Claude Code).

## Stack y versiones

| Capa | Elección | Versión |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | 16.2 |
| Estilos | Tailwind CSS v4 (config por CSS, `@theme` en `globals.css`) | 4 |
| Backend/DB/Auth/Storage | Supabase | — |
| Auth SSR | `@supabase/ssr` + `@supabase/supabase-js` | 0.12 / 2.x |
| PWA | Service worker propio (`public/sw.js`) + manifest | — |
| Deploy | Vercel + Supabase cloud | — |

### Decisión PWA: por qué NO serwist

El handoff sugería `next-pwa`/`serwist`. `next-pwa` está sin mantenimiento. `serwist` 9.x **no
soporta Turbopack**, que es el builder por default de Next 16; obligaría a compilar con `--webpack`
(la vía que Next está discontinuando). Para no atarnos a un builder deprecado ni sumar dependencias
frágiles en un proyecto mantenido por IA, se escribió un **service worker mínimo propio**
(`public/sw.js`): navegación network-first con fallback a `/offline.html`, y assets estáticos
stale-while-revalidate. Cubre lo que pide Fase 0 (instalable + shell offline) y es Turbopack-nativo.
La cola offline de cargas de campo (Fase 1) usa IndexedDB/Dexie a nivel app, independiente del SW.

## Autenticación y roles

- **Email + contraseña** (`signInWithPassword`). Se descartó el magic-link: el email service de
  Supabase tiene rate limit bajo y depender de un mail en obra con mala señal es frágil.
- **El signup público está deshabilitado** (Dashboard → Authentication). Los usuarios se crean a
  mano en el Dashboard con "Auto Confirm"; nacen `campo` y se promueven a admin por SQL.
- Sesión refrescada en cada request por `src/proxy.ts` (Next 16 renombró `middleware` → `proxy`).
  La autorización por ruta se hace en el layout de `(app)` (redirige a `/login` si no hay sesión).
- **Roles:** `admin` (Mati) y `campo` (capataz futuro). Un trigger crea el `profile` al registrarse.
- **RLS:** activado en todas las tablas. Un helper `current_app_role()` (SECURITY DEFINER, sin
  recursión) resuelve el rol priorizando el claim del JWT y cayendo a `profiles.role`. Así las
  políticas funcionan **con o sin** el custom access token hook activado (el hook queda listo en la
  base para activar en el Dashboard como optimización opcional). Ojo: con el hook activo, un cambio
  de rol tarda hasta 1 h (expiry del JWT) en surtir efecto.
- Tablas **admin-only**: rubros, gastos, compromisos, adicionales, ingresos, vencimientos_admin.
  El resto es accesible por cualquier usuario autenticado, con dos reglas transversales:
  - **DELETE físico solo admin** en todo el esquema. Las cascadas de FK ignoran el RLS de las
    tablas hijas, así que un DELETE de campo en `obras` arrasaría las tablas económicas. Lo normal
    es soft-delete (`deleted_at`); el SELECT de campo filtra las filas borradas (admin ve todo).
  - **Costos de `pedidos_materiales` solo admin:** el SELECT directo a la tabla es admin-only; la
    UI de campo lee la vista `pedidos_materiales_campo` (sin `costo_estimado`/`costo_real`/
    `gasto_id`). Campo puede insertar pedidos, pero sin costos (los completa admin).
- **Scoping por obra diferido (decisión consciente):** las políticas compartidas no filtran por
  obra (`obras_usuarios` no existe). Con una sola obra y sin usuarios campo no aporta nada; se
  introduce cuando haya multi-obra real con capataces por obra.

## Modelo de datos

Esquema completo (handoff §4) en `supabase/migrations/`. Todas las tablas de dominio tienen
`created_at` y **borrado lógico** (`deleted_at`) — la obra es evidencia, nada se destruye. Grupos:

- **Núcleo:** obras, etapas, rubros, tareas, dependencias_tareas.
- **Personas:** gremios, personal, asistencias, ingresos_gremios.
- **Materiales:** materiales, pedidos_materiales, stock_eventos.
- **Economía:** gastos, compromisos, adicionales, ingresos.
- **Diario/Admin:** diario_obra, fotos, vencimientos_admin.
- **Sistema:** profiles (rol + metadata).

Reglas de integridad activas: `gastos.rubro_id` NOT NULL con `ON DELETE RESTRICT` (una obra con
gastos no se borra físico); toda obra nueva nace con su rubro "Sin clasificar" (trigger, marcado
`es_sistema = true` y único por obra — buscarlo por el flag, no por el nombre); estados y rangos
de fecha validados por CHECK; índices en todas las FKs y columnas de filtro.

### Convenciones para la cola offline (Fase 1)

- **Idempotencia:** el cliente (Dexie) genera el UUID del PK al capturar y sincroniza con
  `upsert on conflict (id) do nothing` — un reintento nunca duplica. No hay columna extra.
- **`updated_at`** (trigger automático) en todas las tablas de dominio: base para sync
  incremental y last-write-wins.
- **`captured_at`** en las tablas de captura de campo (asistencias, diario_obra, stock_eventos,
  fotos, tareas): instante real de la captura; `created_at` pasa a ser el momento del sync.
- **`created_offline`** marca las filas que entraron por la cola.
- **Fotos:** `url` es nullable + `estado_upload` (`pendiente`/`subida`/`error`) — la fila se
  sincroniza primero, el binario sube cuando hay señal.
- **Asistencias:** `hora_entrada`/`hora_salida` quedan como `time` sin tz (una obra, un huso,
  es-AR); el instante exacto lo da `captured_at`. Decisión consciente, no un olvido.
- **`personal.obra_id`** vincula cada persona a su obra para el flujo de asistencia ("quién
  trabaja acá hoy"). La tabla puente multi-obra se difiere hasta que exista el caso real.

Implementación (Fase 1): `src/lib/offline/` — `db.ts` (Dexie, esquema versionado v1→v4: cola de
escrituras + espejos `personal`/`asistencias_hoy`/`tareas_hoy`/`materiales`/`pedidos_campo`/
`diario_hoy`/`fotos` + store de binarios `fotos_blobs`), `sync.ts` (drenado ordenado por
`capturado_en` con `upsert` idempotente; `do update` para correcciones, `do nothing` en inserts
puros; re-drena si entran capturas durante el sync; registro `alDrenar` para hooks post-drenado),
y un módulo de dominio por tramo: `asistencia.ts` (ciclo presente→medio→ausente→presente),
`tareas.ts` (avance→estado), `materiales.ts` (FALTA/LLEGÓ sobre `pedidos_materiales`, lee por la
vista campo sin costos), `diario.ts` + `fotos.ts` (nota por la cola, foto en dos canales: fila
JSON primero, binario Blob→Storage después vía `subirFotosPendientes`). `useCola.ts` +
`components/ChipSync.tsx` = indicador de estado. La fecha "hoy" la da `fechaHoyISO()` (zona AR) en
`src/lib/format.ts`, compartida por cliente y server. Las fotos requieren un bucket de Storage
`fotos-obra` (config de Dashboard, pendiente); sin él, la nota sincroniza y el binario queda en
`estado_upload = 'error'` hasta que exista.

## Convenciones de UI (handoff §6)

- **Mobile = capturar. Desktop = gestionar y entender.** No se mezclan.
- **Semántica de color fija** (tokens en `globals.css`): verde=ok · amarillo=atención · rojo=acción
  · gris=pendiente · brand (naranja obra)=identidad. Nunca decorativos.
- **es-AR** en números y fechas (`src/lib/format.ts`): `$1.250.000`, "hace 3 días (mar 30/6)".
- Tema claro de alto contraste (se usa al sol en obra).

## Estructura

```
src/
  app/
    (auth)/login/        -> /login  (email + contraseña)
    (app)/               -> /        (área autenticada; layout con guard + header)
    (app)/campo/         -> /campo   (superficie mobile: capturar — placeholder Fase 1)
    (app)/oficina/       -> /oficina (superficie desktop: gestionar — placeholder Fase 1)
    layout.tsx           (root: metadata PWA + registro del SW)
    globals.css          (tema + semántica de color)
  components/            (LogoutButton, ServiceWorkerRegister)
  lib/
    supabase/            (client, server, middleware/updateSession)
    format.ts            (es-AR)
  proxy.ts               (refresh de sesión)
public/
  sw.js, offline.html, manifest.webmanifest, icons/
supabase/
  migrations/            (esquema completo versionado)
scripts/generate-icons.mjs
```

## Qué NO se construyó todavía (fases siguientes)

Cola offline/Dexie y pantallas de campo (Fase 1); economía y dashboards (Fases 2 y 4); cronograma
y alertas (Fase 3); API de export + skills de Cowork (Fase 5); compresión de fotos, multi-obra,
backups (Fase 6). El **esquema** de esas fases ya existe; falta la UI.
