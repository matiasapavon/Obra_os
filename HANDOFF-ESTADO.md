# Obra OS — Handoff de estado (para análisis)

> Documento autocontenido del estado real del proyecto al cierre de la **Fase 0**.
> Pensado para que otro modelo/persona lo analice sin contexto previo.
> El diseño completo por fases (la "biblia" del producto) está en `HANDOFF-obra-os.md`.
> Las decisiones de arquitectura están en `ARCHITECTURE.md`. Roadmap en `tasks/todo.md`.

---

## 1. Qué es el proyecto

Sistema de gestión de obra para **Mati** (arquitecto/constructor, Argentina). No programa; usa la
app desde el **celular en obra** (captura rápida, offline) y desde la **PC en oficina** (economía,
cronograma, dashboards). Lo mantiene **Demian** vía Claude Code. Encima, a futuro, una capa de
inteligencia (**Claude Cowork**) que lee los datos por API para análisis, auditorías y reportes.

**Principio rector:** el campo captura datos crudos con fricción mínima; la inteligencia y el
análisis viven arriba (dashboards + Cowork), nunca al revés.

**Arquitectura conceptual:** dos superficies (mobile = capturar · desktop = gestionar/entender)
sobre un mismo backend, más Cowork por API.

### Principios innegociables (ganan sobre cualquier feature)
1. Campo: ≤3 toques por carga, botones ≥48px, alto contraste. Cero dropdowns anidados en mobile.
2. Offline-first en campo.
3. La plata SOLO en desktop; el mobile nunca pide ni muestra dinero.
4. Cada dato se carga una sola vez.
5. Todo gasto se imputa a un rubro (default "Sin clasificar").
6. Datos accesibles por API (para Cowork).
7. Español rioplatense ("vos") en toda la UI.
8. Simplicidad de mantenimiento: la solución más simple que cumpla; menos dependencias.

---

## 2. Estado actual: **Fase 0 (Fundaciones) COMPLETA y en producción**

Verificado end-to-end: Mati abre la URL en el celular, entra con email+contraseña (quedó admin),
la app carga. Base de datos, auth y deploy funcionando.

### Infraestructura viva
| Pieza | Estado |
|---|---|
| Repo | GitHub: `matiasapavon/Obra_os` (rama `main`) |
| Frontend | Vercel (deploy automático en cada push a `main`) |
| Backend/DB/Auth | Supabase cloud (plan free) |
| Migraciones DB | Aplicadas (`supabase db push`); 20 tablas + RLS verificadas |

### Env vars (en Vercel y en `.env.local` para dev)
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (la key *publishable* nueva de Supabase, no la legacy/secret)

---

## 3. Stack técnico (versiones reales instaladas)

| Capa | Elección | Versión |
|---|---|---|
| Framework | Next.js (App Router) + TypeScript | **16.2.10** |
| Runtime build | Turbopack (default en Next 16) | — |
| React | React | 19.2 |
| Estilos | Tailwind CSS v4 (config por CSS con `@theme`, sin `tailwind.config.js`) | 4 |
| Backend/DB/Auth/Storage | Supabase | — |
| Auth SSR | `@supabase/ssr` + `@supabase/supabase-js` | 0.12 / 2.x |
| PWA | Service worker propio (`public/sw.js`) + manifest | — |
| Deploy | Vercel + Supabase cloud | — |
| Node/npm (dev, Windows 11) | Node 24 / npm 11 | — |

### Desviaciones respecto del diseño original (`HANDOFF-obra-os.md`) — para analizar
1. **PWA sin serwist.** El diseño sugería `next-pwa`/`serwist`. `next-pwa` está sin mantenimiento;
   `serwist` 9.x **no soporta Turbopack** (el builder default de Next 16), obligaría a compilar con
   `--webpack` (vía en discontinuación). Se optó por un **service worker propio mínimo**
   (`public/sw.js`): navegación network-first con fallback a `/offline.html`, assets estáticos
   stale-while-revalidate. Turbopack-nativo, cero deps extra. Cubre lo que pide Fase 0 (instalable +
   shell offline). La cola offline "seria" (IndexedDB/Dexie para cargas de campo) es Fase 1 y es
   independiente del SW.
2. **Auth con contraseña, no magic-link.** El diseño pedía magic-link. En la práctica el email
   service default de Supabase tiene rate limit muy bajo y, sobre todo, **depender de un mail en
   obra con mala señal es frágil**. Se pasó a **email + contraseña** (`signInWithPassword`). El
   usuario se crea desde el dashboard de Supabase con "Auto Confirm" (sin mails). El código de
   magic-link (callback `/auth/callback`) quedó en el repo, inactivo, por si se reactiva.

---

## 4. Arquitectura

### Estructura de carpetas
```
src/
  app/
    (auth)/login/        -> /login            (email + contraseña)
    (app)/               -> /                  (área autenticada: layout con guard + header)
    auth/callback/       -> /auth/callback     (exchange magic-link; inactivo hoy)
    layout.tsx           (root: metadata PWA + registro del SW)
    globals.css          (tema + semántica de color, Tailwind v4 @theme)
  components/            (LogoutButton, ServiceWorkerRegister)
  lib/
    supabase/            (client [browser], server, middleware/updateSession)
    format.ts            (es-AR: formatARS, formatFecha, etc.)
  proxy.ts               (refresh de sesión; Next 16 renombró middleware -> proxy)
public/
  sw.js, offline.html, manifest.webmanifest, icons/ (generados por script)
supabase/
  migrations/20260705000001_esquema_inicial.sql   (esquema COMPLETO)
scripts/generate-icons.mjs   (genera íconos PWA sin deps, con zlib nativo)
```

### Auth y roles
- **Login:** email + contraseña (`signInWithPassword` en el browser client de `@supabase/ssr`).
- **Sesión:** refrescada en cada request por `src/proxy.ts` (patrón oficial App Router).
- **Autorización por ruta:** en el layout de `(app)` — server component que hace `getUser()` y
  redirige a `/login` si no hay sesión.
- **Roles:** `admin` (Mati) y `campo` (capataz futuro). Un **trigger en `auth.users`** crea el
  `profile` al registrarse y **hace admin al primer usuario del sistema**; el resto nace `campo`.
- **RLS:** activado en las 20 tablas. Un helper `current_app_role()` (SECURITY DEFINER, sin
  recursión) resuelve el rol priorizando el claim del JWT y cayendo a `profiles.role`. Así las
  políticas funcionan **con o sin** el custom access token hook activado (el hook está creado en la
  base, listo para activar en el Dashboard como optimización opcional).
- **Split de permisos:** tablas **admin-only** = rubros, gastos, compromisos, adicionales, ingresos,
  vencimientos_admin (la plata). El resto es accesible por cualquier autenticado. El afinado fino
  para `campo` (ocultar plata por columna) se endurece en Fase 1, cuando exista el capataz.

### Modelo de datos (20 tablas, esquema completo ya creado — sin UI para las fases futuras)
Todas las tablas de dominio tienen `created_at` y **borrado lógico** (`deleted_at`). Grupos:
- **Núcleo:** obras, etapas, rubros, tareas, dependencias_tareas.
- **Personas:** gremios, personal, asistencias, ingresos_gremios.
- **Materiales:** materiales, pedidos_materiales, stock_eventos.
- **Economía:** gastos, compromisos, adicionales, ingresos.
- **Diario/Admin:** diario_obra, fotos, vencimientos_admin.
- **Sistema:** profiles (rol + metadata).

Reglas de integridad activas: `gastos.rubro_id` NOT NULL; toda obra nueva nace con su rubro
"Sin clasificar" (trigger); estados validados por CHECK; índices en FKs y columnas de filtro.
Nombres de tablas/columnas **en español** (para que exports y API sean legibles por Mati y Cowork).

### Convenciones de UI/formato
- **Mobile = capturar · Desktop = gestionar/entender.** No se mezclan.
- **Semántica de color FIJA** (tokens en `globals.css`): verde=ok · amarillo=atención · rojo=acción
  · gris=pendiente · brand (naranja obra)=identidad. Nunca decorativos.
- **es-AR** (`src/lib/format.ts`): `$1.250.000` (punto de miles), "hace 3 días (mar 30/6)".
- Tema claro de alto contraste (se usa al sol en obra).

---

## 5. Roadmap (fases) — dónde estamos y qué viene

- **Fase 0 — Fundaciones ✅ (hecha):** scaffold, esquema completo, auth, RLS, PWA instalable, deploy.
- **Fase 1 — Núcleo de campo (siguiente, la más importante):** pantalla **HOY** (mobile) +
  **asistencia** (arrancar por acá, es el hábito diario) + tareas del día + materiales (FALTA/LLEGÓ)
  + nota/foto al diario. **Cola offline en IndexedDB (Dexie)** con sync al reconectar. Vistas de
  tabla en desktop.
- **Fase 2 — Economía (solo-desktop):** presupuesto por rubro, gastos, compromisos, adicionales,
  ingresos, vista caja proyectada 8 semanas.
- **Fase 3 — Cronograma y gremios:** Gantt simple, dependencias, ingresos de gremios, alertas
  unificadas.
- **Fase 4 — Dashboards:** tripleta avance/tiempo/gasto, presupuesto vs real, curva S, rentabilidad,
  export a Excel.
- **Fase 5 — Capa Cowork:** endpoint de export + acceso solo-lectura, `CLAUDE.md` y skills de Cowork.
- **Fase 6 — Pulido:** compresión de fotos (~200KB client-side), multi-obra, backups, onboarding.

**Anti-scope (lo que NO se construye):** app nativa, chat/push interno, facturación AFIP, Gantt con
drag&drop perfecto, multi-tenant, IA embebida en la app (la IA vive en Cowork, afuera).

---

## 6. Loose ends / deuda técnica conocida (pendiente, chico)
1. **Docs desactualizados en 1 punto:** `ARCHITECTURE.md` y `CLAUDE.md` todavía describen el auth
   como magic-link; el auth real ahora es **contraseña**. Actualizar.
2. **Archivo temporal commiteado:** `supabase/.temp/` (scratch de la CLI) se coló en un commit.
   Agregar a `.gitignore` y quitar del tracking.
3. **Custom access token hook** creado en la base pero **no activado** en el Dashboard (funciona el
   fallback a `profiles.role`). Activarlo es una optimización opcional.
4. **RLS de `campo` permisiva** en tablas compartidas (Fase 0 solo tiene admin). Endurecer en Fase 1.
5. **SMTP propio** sin configurar (relevante solo si se reactiva magic-link o se agregan mails
   transaccionales; hoy no hay emails en el flujo).

---

## 7. Preguntas abiertas / temas para una segunda opinión
- ¿El split mobile/desktop conviene resolverlo por **rutas separadas** (`/campo`, `/oficina`) o por
  **layout responsive** con detección de viewport? (Hoy es un solo árbol; la decisión pega fuerte
  en Fase 1.)
- **Estrategia offline (Fase 1):** cola en Dexie con reintentos vs. una lib de sync más armada.
  El diseño pide la más simple y auditable. ¿Riesgos de conflictos/duplicados a vigilar?
- **Multi-obra:** el esquema ya tiene `obra_id` en todo, pero no hay "obra activa" ni selector.
  ¿Cuándo introducir el concepto sin complicar Fase 1?
- **Roles vía JWT claims vs tabla:** hoy hay híbrido (claim con fallback a tabla). ¿Vale activar el
  hook ya, o dejar el fallback hasta que exista el capataz?
- **Contraseña vs magic-link:** se priorizó robustez en campo. ¿Conviene ofrecer ambos, o passkeys?

---

## 8. Cómo correr / operar (referencia rápida)
```bash
npm install
# .env.local con NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
npm run dev            # http://localhost:3000 (Turbopack; el SW se desactiva en dev)
npm run build          # build de producción
npm start              # servir prod (probar PWA/offline en local)

# Migraciones (editar SQL en supabase/migrations/ y luego):
npx supabase db push

# Usuarios: se crean en Supabase Dashboard > Authentication > Users (Auto Confirm).
# El primer usuario creado queda admin automáticamente (trigger).
```
