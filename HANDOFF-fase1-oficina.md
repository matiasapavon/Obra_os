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

**Fase 1 — desktop `/oficina`** 🔨 EN CURSO. FUNDAMENTO listo, faltan las 5 vistas de entidad.
- Hecho (commits `25ba864`, `02e7661`):
  - `src/app/(app)/oficina/layout.tsx` — gate admin (`role !== 'admin'` → `redirect('/campo')`),
    resuelve obra activa, shell desktop (`max-w-6xl mx-auto px-6 py-6`).
  - `src/app/(app)/oficina/OficinaNav.tsx` — tabs (`usePathname`): Tareas/Materiales/Personal/
    Asistencias/Diario.
  - `src/app/(app)/oficina/page.tsx` → `redirect('/oficina/tareas')`.
  - `src/app/(app)/page.tsx` — launcher role-aware (admin: cards Campo/Oficina; campo: redirect).
  - `src/lib/oficina/actualizarCampo.ts` — **server action** de edición inline con allow-list
    `EDITABLES` por tabla + re-chequeo de admin (defensa en profundidad) + `revalidatePath`.
  - `src/components/oficina/` — `TablaOficina.tsx`, `CeldaEditable.tsx` (props: tabla,id,columna,
    valor,tipo `text|number|money|date|select`,opciones?), `BadgeEstado.tsx`.
- ⚠️ **`/oficina` 404ea en runtime** hasta que existan las 5 páginas de entidad (la nav ya apunta a ellas).

## LO QUE SIGUE — arrancá acá

### PASO 1: las 5 vistas de entidad de `/oficina` (cierra Fase 1)
Cada una es un **server component** que reusa el patrón ya construido. NO usar Dexie (desktop es
online, escritura directa). Sacar `obraId` re-resolviendo la obra activa en cada página
(`obras` where `estado='activa'`, `deleted_at is null`, limit 1, `maybeSingle`) — o crear helper
`src/lib/oficina/obra.ts` (`obraActiva(supabase)`) y usarlo en las 5. Joins FK con embedded
selects de PostgREST (`.select("*, personal(nombre)")`). Verificar columnas en
`src/lib/supabase/database.types.ts` ANTES de usarlas. Celdas editables → `<CeldaEditable>`
(ya llama a la server action). Un commit por entidad. typecheck+lint tras cada una, build al final.

1. **`/oficina/tareas/page.tsx`** — cols: `nombre`(text), `estado`(BadgeEstado+select
   pendiente/en_curso/terminada/bloqueada), `porcentaje_avance`(number), `ubicacion`(text),
   `orden`(number), `fecha_inicio_plan`/`fecha_fin_plan`/`fecha_inicio_real`/`fecha_fin_real`(date).
   Order by `orden`.
2. **`/oficina/materiales/page.tsx`** — DOS tablas. (a) Pedidos: `.from("pedidos_materiales")
   .select("*, materiales(nombre)")` → material nombre (RO), `cantidad`(number), `estado`(badge+
   select a_pedir/pedido/en_camino/entregado/faltante), fechas (date), `proveedor`(text),
   **`costo_estimado`/`costo_real`**(money, `formatARS` — ÚNICO lugar con plata), `notas`(text).
   (b) Catálogo materiales: `nombre`(text), `unidad`(select bolsa/m3/ml/un/kg/lt),
   `proveedor_habitual`(text), `lead_time_dias`(number) — verificar que existan.
3. **`/oficina/personal/page.tsx`** — `.select("*, gremios(nombre)")` (si existe FK): `nombre`,
   `rol`, `telefono`(text), gremio nombre(RO), `art_vencimiento`/`seguro_vencimiento`(date, colorear
   celda: warn <30 días, alert vencido), `created_at`(RO).
4. **`/oficina/asistencias/page.tsx`** — read-mostly. `.select("*, personal(nombre)")`: nombre(RO),
   `fecha`(RO), `hora_entrada`/`hora_salida`, `medio_dia`, `observacion`(edit), `created_offline`
   (badge "campo"). Order fecha desc.
5. **`/oficina/diario/page.tsx`** — SOLO LECTURA. `fecha`, `texto`, `clima`, `etiquetas`(pills),
   `created_offline`(badge). Order fecha desc.

### PASO 2: cerrar Fase 1
- Gating por rol ya está en `/oficina/layout.tsx`. Falta decidir si `/campo` necesita gate (hoy
  cualquier autenticado entra; en Fase 1 sin capataz no urge — documentado como diferido).
- Actualizar `tasks/todo.md`: marcar `/oficina` hecho.

### Fases siguientes (roadmap, esquema ya existe, falta UI) — mismo patrón desktop de `/oficina`
- **Fase 2 — economía/plata (solo desktop, admin):** `gastos`, `rubros` (imputación, default
  "Sin clasificar"), `compromisos`, `ingresos`, `adicionales`, `vencimientos_admin`. Linkear
  `pedidos_materiales.gasto_id` a un `gasto`. Reusar `TablaOficina`/`CeldaEditable`/server action.
  Agregar `gastos`, `rubros`, etc. al allow-list `EDITABLES`.
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
