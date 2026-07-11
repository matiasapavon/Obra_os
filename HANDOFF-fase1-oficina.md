# HANDOFF — continuar Obra OS (Fase 1 desktop → Fase 6)

> Escrito 2026-07-11. Pensado para retomar en una sesión SIN skills instaladas (van directo al
> código). Todo lo de acá es autónomo: leé este archivo + los que cita y podés seguir sin más contexto.

## Estado actual (todo en `main`, sin push)

**Fase 0** ✅ (esquema completo 20 tablas, auth email+pass, RLS, PWA, deploy Vercel/Supabase).
**Hardening post-auditoría** ✅ (3 migraciones aplicadas por Demian).

**Fase 1 — captura de campo** ✅ COMPLETA. Superficie mobile `/campo` con cola offline:
- `src/lib/offline/` — `db.ts` (Dexie v1→v4: cola + espejos `personal`/`asistencias_hoy`/`tareas_hoy`/
  `materiales`/`pedidos_campo`/`diario_hoy`/`fotos` + `fotos_blobs`), `sync.ts` (drenado ordenado
  por `capturado_en`, upsert idempotente `do update`/`do nothing`, re-drena capturas entrantes,
  registro `alDrenar` para post-drenado), `asistencia.ts`, `tareas.ts`, `materiales.ts`,
  `diario.ts`, `fotos.ts` (uploader a Storage), `useCola.ts`, `components/ChipSync.tsx`.
- Pantallas: `/campo` (home con nav a las 4), `/campo/asistencia`, `/campo/tareas`,
  `/campo/materiales`, `/campo/diario`. Cada tramo revisado y con build verde.

**Fase 1 — desktop `/oficina`** ✅ COMPLETA. Fundamento + las 5 vistas de entidad, build verde.
- Fundamento (`25ba864`, `02e7661`):
  - `src/app/(app)/oficina/layout.tsx` — gate admin (`role !== 'admin'` → `redirect('/campo')`),
    resuelve obra activa, shell desktop (`max-w-6xl mx-auto px-6 py-6`).
  - `src/app/(app)/oficina/OficinaNav.tsx` — tabs (`usePathname`).
  - `src/app/(app)/oficina/page.tsx` → `redirect('/oficina/tareas')`.
  - `src/app/(app)/page.tsx` — launcher role-aware (admin: cards Campo/Oficina; campo: redirect).
  - `src/lib/oficina/actualizarCampo.ts` — **server action** de edición inline con allow-list
    `EDITABLES` por tabla + re-chequeo de admin + `revalidatePath`.
  - `src/lib/oficina/obra.ts` — helper `obraActiva(supabase)`.
  - `src/components/oficina/` — `TablaOficina.tsx` (props `columnas`, `hayFilas`, `vacio`),
    `CeldaEditable.tsx` (tabla,id,columna,valor,tipo `text|number|money|date|select`,opciones?),
    `BadgeEstado.tsx`.
- Vistas (`d5acb72` tareas, `3641536` materiales+pedidos con costos, `6b31cc9` personal,
  `ad1e3f2` asistencias, diario solo-lectura): server components que reusan el patrón, escritura
  directa a Supabase (NO Dexie), joins FK con embedded selects. Materiales es el ÚNICO lugar con
  plata (`costo_estimado`/`costo_real`, `formatARS`), admin-gateado.
- Diferido consciente: gate de `/campo` (sin capataz no urge); alta de filas desde oficina
  (personal/tareas) quedó fuera — hoy solo edición inline de lo existente. Agregar si hace falta.

## LO QUE SIGUE — arrancá acá: FASE 2 (economía / plata)

Toda desktop, admin-only, **mismo patrón de `/oficina`** ya establecido (TablaOficina +
CeldaEditable + server action `actualizarCampo`). Reusá todo eso.

### Pasos concretos
1. **Agregar las tablas de plata al allow-list** `EDITABLES` en `src/lib/oficina/actualizarCampo.ts`
   (hoy solo tiene tareas/personal/materiales/pedidos_materiales/asistencias): sumá `gastos`,
   `rubros`, `compromisos`, `ingresos`, `adicionales`, `vencimientos_admin` con sus columnas
   editables (verificá en `database.types.ts`).
2. **Nuevas rutas** bajo `/oficina/` + tabs en `OficinaNav.tsx`: `gastos`, `rubros`, y las demás.
3. **Rubros:** cada obra nace con rubro "Sin clasificar" (trigger Fase 0). Todo gasto se imputa a
   un rubro (principio #5, default "Sin clasificar"). Vista de rubros con `presupuesto_base` (money)
   editable + resumen de gastado por rubro.
4. **Gastos:** tabla con imputación a rubro (select de rubros de la obra), monto (`formatARS`),
   fecha, proveedor, medio de pago, comprobante. Linkear `pedidos_materiales.gasto_id` → un `gasto`
   (el puente que quedó preparado en Fase 1).
5. **Compromisos/ingresos/adicionales/vencimientos_admin:** tablas simples con el mismo patrón.
6. Verificá `typecheck`/`lint`/`build` por vista; commit por entidad.

### Fase 2 — al terminar, actualizá `tasks/todo.md`.

### Fases siguientes (roadmap, esquema ya existe, falta UI) — mismo patrón desktop de `/oficina`
- **Fase 3 — cronograma + alertas:** `etapas`, `dependencias`, vencimientos que disparan avisos.
- **Fase 4 — dashboards:** vistas de resumen (avance, plata por rubro, asistencia). Charts.
- **Fase 5 — API export + Cowork:** endpoints legibles (tablas/columnas en español, ya está).
- **Fase 6 — pulido:** compresión de fotos antes de subir, multi-obra (tabla puente
  `obras_usuarios` + selector de obra), backups.

## PENDIENTE DE DEMIAN (Dashboard, no código)
- **Crear bucket de Storage `fotos-obra`** con policies insert/select para `authenticated`. Sin él
  las notas del diario sincronizan pero las fotos quedan en `estado_upload='error'`.
- **`git push`** para deploy en Vercel (21+ commits locales sin pushear).
- **Prueba manual offline end-to-end** de las 4 pantallas de campo.

## Convenciones a respetar (de CLAUDE.md / AGENTS.md)
- **Este NO es el Next que conocés** (Next 16, Turbopack, `middleware`→`proxy`). Leé
  `node_modules/next/dist/docs/` ante la duda.
- Campo: ≤3 toques, botones ≥48px (`min-h-12`), alto contraste, cero dropdowns anidados en mobile.
- **La plata SOLO en desktop/admin.** Mobile nunca pide ni muestra dinero.
- Color semántico FIJO (tokens `src/app/globals.css`): verde=ok, amarillo=atención, rojo=acción,
  gris=pendiente, brand=naranja. Nunca decorativo.
- es-AR "vos" en toda la UI. Números/fechas con helpers de `src/lib/format.ts`.
- Migraciones: SQL NUEVO en `supabase/migrations/` → `npx supabase db push` → `npm run gen:types`.
  Nunca editar migraciones aplicadas.
- Verificación: `npm run typecheck` · `npm run lint` · `npm run build` (CI corre los 3).
- Commits en español, trailer `Co-Authored-By: Claude <noreply@anthropic.com>`.

## Notas técnicas útiles
- Server client: `import { createClient } from "@/lib/supabase/server"` → `await createClient()`.
  Browser client: `@/lib/supabase/client` (sync).
- Rol server-side: `const { data: { user } } = await supabase.auth.getUser();` →
  `supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()`.
- Estado obra activa literal = `'activa'` (CHECK: `activa|pausada|terminada`).
- `pedidos_materiales`: campo lee por la vista `pedidos_materiales_campo` (sin costos); admin lee
  la tabla base con costos. NUNCA mandar costos desde payloads de campo (RLS INSERT lo exige null).
- Cola offline: cliente genera UUID del PK, upsert idempotente. Payloads de update DEBEN incluir
  columnas NOT NULL (el INSERT del upsert las valida antes de resolver conflicto).
- Docs vivas: `tasks/todo.md` (estado), `ARCHITECTURE.md` (decisiones), specs en
  `docs/superpowers/specs/`, plan en `docs/superpowers/plans/`.
```
```
