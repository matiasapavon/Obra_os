# Auditoría de diseño UI/UX — 2026-07-18

Referencia estética: diseño Apple (jerarquía por peso, cards agrupadas, radios
generosos, un acento, tabular-nums, transiciones sutiles) aplicado sobre **tema
claro en toda la app** (decisión confirmada: light en campo Y oficina — el alto
contraste al sol manda, y una sola paleta simplifica mantenimiento).

## Fase 1 — Token pass en `globals.css` (habilita todo, bajo riesgo)

- [x] `--color-border` y `--color-surface`: reemplazar `black/10`, `black/5`
      hardcodeado (~15 archivos) por tokens semánticos
- [x] Tokens de radio y sombra: `--radius-card: 1rem`, `--shadow-card` sutil tintada
      con ink (hoy: cero sombras en toda la app → sin jerarquía de elevación)
- [x] Token de motion: `--ease-standard` 200ms para hover/focus/press
- [x] `color-scheme: light` explícito (inputs nativos/scrollbars coherentes)
- [x] Unificar grises: `--color-pending` (#9ca3af frío) → misma temperatura cálida
      que `--color-muted` (#6b6155)

## Fase 2 — Fixes de campo

- [x] Bug semántico: `TareasClient.tsx` — tarea "bloqueada" con borde gris
      (=pendiente) en vez de rojo (=acción)
- [x] Slider de avance → botones de step ≥48px (único control no táctil de campo)
- [x] Errores silenciosos en los 4 guardados offline (asistencia, materiales,
      punch, diario) → feedback visible de error
- [x] Bajar saturación en filas de lista (border+fondo+texto del mismo color);
      color pleno solo para estados que piden acción
- [x] `--color-surface` para diferenciar página vs. card sin depender de bordes

## Fase 3 — Fixes de oficina (light, lenguaje Apple)

- [x] Cards agrupadas con `--radius-card` + `--shadow-card` (estilo iOS Settings
      claro: superficies blancas sobre fondo gris cálido muy suave)
- [x] Reorganizar `OficinaNav.tsx`: 16 tabs → 3-4 clusters (general/operación/plata)
- [x] Tablas de dinero: `font-medium` en montos, fila completa resaltada cuando un
      rubro supera presupuesto, revisar `text-sm` fijo
- [x] Ícono lápiz en hover en `CeldaEditable.tsx` (affordance de edición inline)
- [x] Jerarquía en resumen: destacar Caja sobre las otras 2 tarjetas
- [x] Link "ir a campo" más visible
- [x] Emojis del launcher → SVGs simples propios
- [x] `focus-visible:ring` en botón primario de `FormAlta.tsx`; contenedor para
      error de login
- [x] `tracking-tight` en títulos grandes

## Fase 4 — Componentes compartidos (al final)

- [x] Extraer `Button` (variante primary/secondary/danger/success × tamaño
      campo/oficina) y `ChipToggle` en `src/components/ui/` + util `cx`
- [x] Convención de radios documentada en `globals.css`: 2xl=contenedor,
      lg=control, full=pill de estado
- [x] Migrados los botones de acción y los 3 chips toggle idénticos
      (diario/punch/materiales) a los componentes
- Nota: NO se creó `Card` (solo 2 patrones, YAGNI) ni se migraron botones
      bespoke (login, "+" punteados, toggle Resuelto) — fuera de la familia.

## Lo que está BIEN (no tocar)

- Cero valores arbitrarios fuera de `globals.css` · `tabular-nums` en oficina ·
  semántica de color en badges · copy "vos" · offline-safe (sin CDN runtime)

## Descartado de las skills (viola principios)

GSAP/motion pesado, gradientes, glassmorphism, grain, dark mode (descartado por
decisión: light en todo), fuentes de moda, asimetrías editoriales.

## Review

**2026-07-18 — Fases 1-3 completas.** Verificado con lint + typecheck + build
prod + browser (localhost:4001).

- Fase 1: tokens `--color-surface/line/line-strong`, `--radius-card`,
  `--shadow-card`, `--ease-standard`, `color-scheme: light`, gris pending
  unificado a cálido (#a8a099). Migrados ~20 usos de `black/N` a tokens.
- Fase 2: bug semántico de tarea bloqueada (borde rojo), slider → botones
  −25/+25/Listo ≥48px, `CapturaSegura` (hook `useCaptura` + banner
  `AvisoCaptura`) cableado en los 5 clientes de campo (asistencia, tareas,
  materiales, diario, punch) — los forms ya no se limpian si el guardado local
  falla. Filas de lista des-saturadas (color pleno solo en estados de acción).
- Fase 3: nav agrupada (Obra/Operación/Plata) con pills, "Ir a campo" como
  botón, cards del resumen con `rounded-card + shadow-card` y Caja destacada
  (borde brand), montos `font-medium`, fila entera `bg-alert/5` en rubro
  pasado, lápiz en hover de `CeldaEditable`, focus ring en FormAlta, error de
  login con contenedor, launcher con SVGs propios (sin emojis).
**2026-07-18 — Fase 4 completa.** Verificado con typecheck + lint + build prod +
browser (localhost:4001): `Button` (48px campo / 40px oficina, 4 variantes con
colores correctos) y `ChipToggle` (48px, toggle relleno brand) renderizan bien.
Todas las fases del plan cerradas.

Notas de la verificación:
- El dev server de otra sesión servía CSS stale (utilities nuevas ausentes);
  el build de prod las compila bien. Reiniciar ese dev server si se ve raro.
- Durante la prueba quedó marcada una asistencia real: "Emilio González"
  Presente el sáb 18/7 (el ciclo de estados no vuelve a "Sin marcar").
  Borrar por SQL si molesta.
