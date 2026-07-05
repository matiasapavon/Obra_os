@AGENTS.md

# Obra OS — contexto del proyecto

Sistema de gestión de obra para **Mati** (arquitecto/constructor, Argentina). No programa; usa la
app desde el celular en obra y desde la PC en oficina. Lo mantiene **Demian** vía Claude Code.
Diseño completo por fases: `HANDOFF-obra-os.md`. Estado y roadmap: `tasks/todo.md`. Arquitectura y
decisiones: `ARCHITECTURE.md`. **Estado actual: Fase 0 completa.**

## Principios innegociables (ganan sobre cualquier feature)
1. Campo: ≤3 toques por carga, botones ≥48px, alto contraste. Cero dropdowns anidados en mobile.
2. Offline-first en campo (Fase 1: cola IndexedDB/Dexie).
3. La plata SOLO en desktop; el mobile nunca pide ni muestra dinero.
4. Cada dato se carga una sola vez.
5. Todo gasto se imputa a un rubro (default "Sin clasificar").
6. Datos accesibles por API (para Cowork).
7. Español rioplatense ("vos") en toda la UI.
8. Simplicidad de mantenimiento: la solución más simple que cumpla; menos dependencias.

## Convenciones
- **Mobile = capturar · Desktop = gestionar/entender.** No mezclar.
- **Color con semántica fija** (tokens en `src/app/globals.css`): verde=ok, amarillo=atención,
  rojo=acción, gris=pendiente, brand=naranja obra. Nunca decorativos.
- **es-AR** para números/fechas: usar helpers de `src/lib/format.ts` (`formatARS`, `formatFecha`, …).
- Nombres de tablas/columnas en español (exports y API legibles por Mati y Cowork).

## Comandos
- Dev: `npm run dev` · Build: `npm run build` · Servir prod (probar PWA): `npm start`.
- Migraciones: editar SQL en `supabase/migrations/` → `npx supabase db push`.
- Íconos PWA: `node scripts/generate-icons.mjs`.

## Notas técnicas
- Next 16 usa Turbopack por default y renombró `middleware` → `proxy` (ver `src/proxy.ts`).
- Auth con `@supabase/ssr`; nunca usar el paquete deprecado `auth-helpers`.
- PWA con service worker propio (`public/sw.js`), NO serwist (no soporta Turbopack).
- RLS en todas las tablas; el primer usuario registrado queda admin automáticamente.
