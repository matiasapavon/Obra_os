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

- Magic-link por email (sin contraseñas). Flujo PKCE (`?code`) con fallback a `token_hash` en
  `/auth/callback`, así funciona con el template de mail por default de Supabase sin tocarlo.
- Sesión refrescada en cada request por `src/proxy.ts` (Next 16 renombró `middleware` → `proxy`).
  La autorización por ruta se hace en el layout de `(app)` (redirige a `/login` si no hay sesión).
- **Roles:** `admin` (Mati) y `campo` (capataz futuro). Un trigger crea el `profile` al registrarse
  y **hace admin al primer usuario del sistema**; el resto nace `campo`.
- **RLS:** activado en todas las tablas. Un helper `current_app_role()` (SECURITY DEFINER, sin
  recursión) resuelve el rol priorizando el claim del JWT y cayendo a `profiles.role`. Así las
  políticas funcionan **con o sin** el custom access token hook activado (el hook queda listo en la
  base para activar en el Dashboard como optimización opcional).
- Tablas **admin-only**: rubros, gastos, compromisos, adicionales, ingresos, vencimientos_admin.
  El resto es accesible por cualquier usuario autenticado; el afinado fino para `campo` (ocultar
  plata por columna) se endurece en Fase 1, cuando exista el capataz.

## Modelo de datos

Esquema completo (handoff §4) en `supabase/migrations/`. Todas las tablas de dominio tienen
`created_at` y **borrado lógico** (`deleted_at`) — la obra es evidencia, nada se destruye. Grupos:

- **Núcleo:** obras, etapas, rubros, tareas, dependencias_tareas.
- **Personas:** gremios, personal, asistencias, ingresos_gremios.
- **Materiales:** materiales, pedidos_materiales, stock_eventos.
- **Economía:** gastos, compromisos, adicionales, ingresos.
- **Diario/Admin:** diario_obra, fotos, vencimientos_admin.
- **Sistema:** profiles (rol + metadata).

Reglas de integridad activas: `gastos.rubro_id` NOT NULL; toda obra nueva nace con su rubro
"Sin clasificar" (trigger); estados validados por CHECK; índices en FKs y columnas de filtro.

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
    (auth)/login/        -> /login  (magic-link)
    (app)/               -> /        (área autenticada; layout con guard + header)
    auth/callback/       -> /auth/callback  (exchange del magic-link)
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
