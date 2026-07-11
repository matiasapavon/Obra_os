# Asistencia + cola offline — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pantalla de asistencia en `/campo/asistencia` que funciona sin señal, con cola offline en Dexie y sync idempotente a Supabase.

**Architecture:** Capa `src/lib/offline/` (Dexie: cola de escrituras + espejo de lecturas) consumida por componentes cliente. El server component de la página hidrata el espejo cuando hay red; sin red la UI lee el espejo. Toda escritura pasa por `encolar()`, que hace upsert a Supabase al reconectar. Spec: `docs/superpowers/specs/2026-07-11-asistencia-offline-design.md`.

**Tech Stack:** Next 16 (App Router, Turbopack), Supabase (`@supabase/ssr`), Dexie + dexie-react-hooks, Tailwind v4. **No hay framework de tests en el repo** (decisión del proyecto: CI = lint + typecheck + build); la verificación de cada task es `npm run typecheck` y, al final, build + prueba manual offline.

**Convenciones a respetar (CLAUDE.md):** es-AR "vos" en UI, botones ≥48px, colores semánticos de `globals.css` (`ok`/`warn`/`alert`/`pending`/`brand`), la plata nunca en mobile.

---

### Task 1: Dependencias

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Instalar dexie**

Run: `npm install dexie dexie-react-hooks`
Expected: agrega ambas a `dependencies` sin errores de peer deps.

- [ ] **Step 2: Verificar**

Run: `npm run typecheck`
Expected: PASS (sin cambios de código todavía).

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "Fase 1: dexie para la cola offline"
```

---

### Task 2: Esquema Dexie (`db.ts`) + tipos compartidos

**Files:**
- Create: `src/lib/offline/db.ts`

- [ ] **Step 1: Crear `src/lib/offline/db.ts`**

```typescript
import Dexie, { type EntityTable } from "dexie";
import type { Database } from "@/lib/supabase/database.types";

// Tablas remotas que la cola sabe sincronizar (crece en próximos tramos).
export type TablaSincronizable = "asistencias" | "personal";

export type AsistenciaRow = Database["public"]["Tables"]["asistencias"]["Row"];
export type PersonalRow = Database["public"]["Tables"]["personal"]["Row"];

// Ítem de la cola de escrituras. El id es el UUID del PK remoto (lo genera el
// cliente al capturar): reintentar el upsert nunca duplica.
export interface ItemCola {
  id: string;
  tabla: TablaSincronizable;
  payload: Record<string, unknown>;
  estado: "pendiente" | "error";
  error_msg?: string;
  capturado_en: string; // ISO
}

// Espejo local de lecturas para operar sin señal.
// Se pisa completo en cada hidratación con red (sync incremental: fuera de alcance).
const db = new Dexie("obra-os") as Dexie & {
  cola: EntityTable<ItemCola, "id">;
  personal: EntityTable<PersonalRow, "id">;
  asistencias_hoy: EntityTable<AsistenciaRow, "id">;
};

db.version(1).stores({
  cola: "id, estado, tabla",
  personal: "id, obra_id",
  asistencias_hoy: "id, personal_id",
});

export { db };
```

- [ ] **Step 2: Verificar**

Run: `npm run typecheck`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/offline/db.ts
git commit -m "Fase 1: esquema Dexie (cola + espejo local)"
```

---

### Task 3: Motor de sync (`sync.ts`)

**Files:**
- Create: `src/lib/offline/sync.ts`

- [ ] **Step 1: Crear `src/lib/offline/sync.ts`**

```typescript
import { createClient } from "@/lib/supabase/client";
import { db, type ItemCola, type TablaSincronizable } from "./db";

// `do update` para poder corregir un tap (mismo id, payload nuevo);
// `do nothing` (ignoreDuplicates) para inserts puros como personal.
const OPCIONES_UPSERT: Record<TablaSincronizable, { ignoreDuplicates: boolean }> = {
  asistencias: { ignoreDuplicates: false },
  personal: { ignoreDuplicates: true },
};

let sincronizando = false;

/** Escribe un ítem en la cola y dispara el sync si hay red. */
export async function encolar(
  tabla: TablaSincronizable,
  payload: Record<string, unknown> & { id: string },
): Promise<void> {
  const item: ItemCola = {
    id: payload.id,
    tabla,
    payload,
    estado: "pendiente",
    capturado_en: new Date().toISOString(),
  };
  // put: si el mismo id se re-captura antes de sincronizar, gana el último payload.
  await db.cola.put(item);
  if (navigator.onLine) void sincronizar();
}

/** Drena la cola contra Supabase. Errores de servidor → estado 'error' (sin loop). */
export async function sincronizar(): Promise<void> {
  if (sincronizando || !navigator.onLine) return;
  sincronizando = true;
  try {
    const supabase = createClient();
    const pendientes = await db.cola.where("estado").equals("pendiente").toArray();
    for (const item of pendientes) {
      const { error } = await supabase
        .from(item.tabla)
        // El payload viene tipado desde encolarAsistencia/encolarPersona; acá ya es opaco.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert(item.payload as any, OPCIONES_UPSERT[item.tabla]);
      if (error) {
        // Sin red el fetch lanza (catch de abajo); un PostgrestError acá es un
        // rechazo real (RLS/CHECK): no reintentar en loop.
        await db.cola.update(item.id, { estado: "error", error_msg: error.message });
      } else {
        await db.cola.delete(item.id);
      }
    }
  } catch {
    // Red caída a mitad de camino: los pendientes quedan pendientes.
  } finally {
    sincronizando = false;
  }
}

/** Reintenta también los ítems en error (tap manual en el chip). */
export async function reintentarErrores(): Promise<void> {
  await db.cola.where("estado").equals("error").modify({ estado: "pendiente" });
  await sincronizar();
}

let escuchando = false;

/** Registra los triggers de re-sync (idempotente; llamar desde un efecto cliente). */
export function escucharReconexion(): void {
  if (escuchando || typeof window === "undefined") return;
  escuchando = true;
  window.addEventListener("online", () => void sincronizar());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void sincronizar();
  });
}
```

- [ ] **Step 2: Verificar**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/offline/sync.ts
git commit -m "Fase 1: motor de sync de la cola offline"
```

---

### Task 4: Hook `useCola` + chip de estado

**Files:**
- Create: `src/lib/offline/useCola.ts`
- Create: `src/components/ChipSync.tsx`

- [ ] **Step 1: Crear `src/lib/offline/useCola.ts`**

```typescript
"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { escucharReconexion } from "./sync";

/** Estado reactivo de la cola offline para la UI. */
export function useCola() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    escucharReconexion();
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const pendientes =
    useLiveQuery(() => db.cola.where("estado").equals("pendiente").count()) ?? 0;
  const errores =
    useLiveQuery(() => db.cola.where("estado").equals("error").count()) ?? 0;

  return { pendientes, errores, online };
}
```

- [ ] **Step 2: Crear `src/components/ChipSync.tsx`**

```tsx
"use client";

import { useCola } from "@/lib/offline/useCola";
import { reintentarErrores } from "@/lib/offline/sync";

// Chip de estado de la cola offline. Tap = reintento manual (útil si quedaron errores).
export default function ChipSync() {
  const { pendientes, errores, online } = useCola();

  let clase = "bg-ok/15 text-ok";
  let texto = "Sincronizado";
  if (!online) {
    clase = "bg-pending/20 text-muted";
    texto = pendientes > 0 ? `Sin señal · ${pendientes}` : "Sin señal";
  } else if (errores > 0) {
    clase = "bg-warn/20 text-warn";
    texto = `${errores} con error`;
  } else if (pendientes > 0) {
    clase = "bg-warn/20 text-warn";
    texto = `${pendientes} pendientes`;
  }

  return (
    <button
      type="button"
      onClick={() => void reintentarErrores()}
      className={`min-h-12 rounded-full px-4 text-sm font-semibold ${clase}`}
    >
      {texto}
    </button>
  );
}
```

- [ ] **Step 3: Verificar**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/lib/offline/useCola.ts src/components/ChipSync.tsx
git commit -m "Fase 1: hook useCola y chip de sync"
```

---

### Task 5: Capa de dominio de asistencia (`asistencia.ts`)

**Files:**
- Create: `src/lib/offline/asistencia.ts`

Estados de UI y su persistencia (spec): `pendiente` (sin fila) → `presente` (fila `medio_dia=false`) → `medio` (fila `medio_dia=true`) → `ausente` (fila con `deleted_at` — soft-delete del mismo id) → `pendiente`.

- [ ] **Step 1: Crear `src/lib/offline/asistencia.ts`**

```typescript
import { db, type AsistenciaRow, type PersonalRow } from "./db";
import { encolar } from "./sync";

export type EstadoAsistencia = "pendiente" | "presente" | "medio" | "ausente";

export const SIGUIENTE_ESTADO: Record<EstadoAsistencia, EstadoAsistencia> = {
  pendiente: "presente",
  presente: "medio",
  medio: "ausente",
  ausente: "pendiente",
};

export function estadoDeFila(fila: AsistenciaRow | undefined): EstadoAsistencia {
  if (!fila) return "pendiente";
  if (fila.deleted_at) return "ausente";
  return fila.medio_dia ? "medio" : "presente";
}

function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Aplica un estado de UI a una persona: actualiza el espejo local y encola el
 * upsert. Reutiliza el id de la fila existente (corrección idempotente).
 * pendiente→pendiente con fila previa = volver atrás un ciclo completo: se
 * soft-borra igual que ausente (la fila ya existe en la nube, no se puede "des-crear").
 */
export async function marcarAsistencia(
  obraId: string,
  personalId: string,
  estado: EstadoAsistencia,
  filaPrevia: AsistenciaRow | undefined,
): Promise<void> {
  const ahora = new Date().toISOString();
  const id = filaPrevia?.id ?? crypto.randomUUID();

  if (estado === "pendiente" && !filaPrevia) return; // nada que persistir

  const fila: AsistenciaRow = {
    id,
    obra_id: obraId,
    personal_id: personalId,
    fecha: filaPrevia?.fecha ?? hoyISO(),
    medio_dia: estado === "medio",
    hora_entrada: null,
    hora_salida: null,
    observacion: null,
    created_offline: true,
    captured_at: filaPrevia?.captured_at ?? ahora,
    created_at: filaPrevia?.created_at ?? ahora,
    updated_at: ahora,
    deleted_at: estado === "ausente" || estado === "pendiente" ? ahora : null,
  };

  await db.asistencias_hoy.put(fila);
  // Payload de upsert: solo columnas que campo puede escribir (created_at/updated_at
  // los maneja la base; mandarlos rompería el trigger de updated_at).
  await encolar("asistencias", {
    id: fila.id,
    obra_id: fila.obra_id,
    personal_id: fila.personal_id,
    fecha: fila.fecha,
    medio_dia: fila.medio_dia,
    created_offline: true,
    captured_at: fila.captured_at,
    deleted_at: fila.deleted_at,
  });
}

/** Alta mínima de persona desde mobile (nombre + rol opcional). */
export async function altaPersona(
  obraId: string,
  nombre: string,
  rol: string | null,
): Promise<void> {
  const ahora = new Date().toISOString();
  const fila: PersonalRow = {
    id: crypto.randomUUID(),
    nombre,
    rol,
    obra_id: obraId,
    gremio_id: null,
    telefono: null,
    art_vencimiento: null,
    seguro_vencimiento: null,
    created_at: ahora,
    updated_at: ahora,
    deleted_at: null,
  };
  await db.personal.put(fila);
  await encolar("personal", {
    id: fila.id,
    nombre: fila.nombre,
    rol: fila.rol,
    obra_id: fila.obra_id,
  });
}

/** Hidrata el espejo local con datos frescos del servidor (pisa todo). */
export async function hidratarEspejo(
  personal: PersonalRow[],
  asistenciasHoy: AsistenciaRow[],
): Promise<void> {
  await db.transaction("rw", db.cola, db.personal, db.asistencias_hoy, async () => {
    // No pisar personal creado offline que todavía no sincronizó.
    const idsEnCola = new Set((await db.cola.toArray()).map((i) => i.id));
    await db.personal.where("id").noneOf([...idsEnCola]).delete();
    await db.personal.bulkPut(personal.filter((p) => !idsEnCola.has(p.id)));
    await db.asistencias_hoy.where("id").noneOf([...idsEnCola]).delete();
    await db.asistencias_hoy.bulkPut(asistenciasHoy.filter((a) => !idsEnCola.has(a.id)));
  });
}
```

- [ ] **Step 2: Verificar**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/lib/offline/asistencia.ts
git commit -m "Fase 1: dominio de asistencia sobre la cola offline"
```

---

### Task 6: Página `/campo/asistencia` (server + cliente)

**Files:**
- Create: `src/app/(app)/campo/asistencia/page.tsx` (server)
- Create: `src/app/(app)/campo/asistencia/AsistenciaClient.tsx` (cliente)

- [ ] **Step 1: Crear `src/app/(app)/campo/asistencia/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase/server";
import AsistenciaClient from "./AsistenciaClient";

// Server component: resuelve obra activa + datos frescos y se los pasa al
// cliente, que los espeja en Dexie. Sin red, el cliente opera solo con el espejo.
export default async function AsistenciaPage() {
  const supabase = await createClient();

  const { data: obra } = await supabase
    .from("obras")
    .select("id, nombre")
    .eq("estado", "activa")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!obra) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center text-muted">
        No hay ninguna obra activa. Creala desde la oficina.
      </div>
    );
  }

  const hoy = new Date().toISOString().slice(0, 10);
  const [{ data: personal }, { data: asistencias }] = await Promise.all([
    supabase
      .from("personal")
      .select("*")
      .eq("obra_id", obra.id)
      .is("deleted_at", null)
      .order("nombre"),
    supabase
      .from("asistencias")
      .select("*")
      .eq("obra_id", obra.id)
      .eq("fecha", hoy),
  ]);

  return (
    <AsistenciaClient
      obraId={obra.id}
      personalServidor={personal ?? []}
      asistenciasServidor={asistencias ?? []}
    />
  );
}
```

Nota: el SELECT de `asistencias` ya viene filtrado por RLS (`deleted_at is null`), no hace falta re-filtrar. Verificá el valor real del estado activo en la migración de Fase 0 (`grep -i "estado" supabase/migrations/*fase0*` o la primera migración): si el CHECK usa otro literal (p. ej. `'activo'` o `'en_curso'`), usá ese.

- [ ] **Step 2: Crear `src/app/(app)/campo/asistencia/AsistenciaClient.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type AsistenciaRow, type PersonalRow } from "@/lib/offline/db";
import {
  estadoDeFila,
  marcarAsistencia,
  altaPersona,
  hidratarEspejo,
  SIGUIENTE_ESTADO,
  type EstadoAsistencia,
} from "@/lib/offline/asistencia";
import ChipSync from "@/components/ChipSync";
import { formatFechaCorta } from "@/lib/format";

const ESTILO: Record<EstadoAsistencia, { clase: string; etiqueta: string }> = {
  pendiente: { clase: "border-pending/50 bg-pending/10 text-muted", etiqueta: "Sin marcar" },
  presente: { clase: "border-ok bg-ok/10 text-ok", etiqueta: "Presente" },
  medio: { clase: "border-warn bg-warn/10 text-warn", etiqueta: "Medio día" },
  ausente: { clase: "border-alert bg-alert/10 text-alert", etiqueta: "Ausente" },
};

export default function AsistenciaClient({
  obraId,
  personalServidor,
  asistenciasServidor,
}: {
  obraId: string;
  personalServidor: PersonalRow[];
  asistenciasServidor: AsistenciaRow[];
}) {
  const [altaAbierta, setAltaAbierta] = useState(false);
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("");

  // Espejar los datos del server en Dexie (solo si llegaron: sin red la página
  // se sirve del cache del SW y los props pueden venir de una carga vieja).
  useEffect(() => {
    if (personalServidor.length > 0 || asistenciasServidor.length > 0) {
      void hidratarEspejo(personalServidor, asistenciasServidor);
    }
  }, [personalServidor, asistenciasServidor]);

  // La UI SIEMPRE lee del espejo: una sola fuente de verdad local.
  const personal = useLiveQuery(
    () => db.personal.where("obra_id").equals(obraId).sortBy("nombre"),
    [obraId],
  );
  const asistencias = useLiveQuery(() => db.asistencias_hoy.toArray(), []);

  const filaDe = (personalId: string) =>
    asistencias?.find((a) => a.personal_id === personalId);

  async function onTap(persona: PersonalRow) {
    const fila = filaDe(persona.id);
    const siguiente = SIGUIENTE_ESTADO[estadoDeFila(fila)];
    await marcarAsistencia(obraId, persona.id, siguiente, fila);
  }

  async function onAlta(e: React.FormEvent) {
    e.preventDefault();
    const n = nombre.trim();
    if (!n) return;
    await altaPersona(obraId, n, rol.trim() || null);
    setNombre("");
    setRol("");
    setAltaAbierta(false);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-ink">
          Asistencia · {formatFechaCorta(new Date())}
        </h1>
        <ChipSync />
      </div>

      <ul className="flex flex-col gap-2">
        {(personal ?? []).map((p) => {
          const estado = estadoDeFila(filaDe(p.id));
          const { clase, etiqueta } = ESTILO[estado];
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => void onTap(p)}
                className={`flex min-h-14 w-full items-center justify-between rounded-xl border-2 px-4 text-left ${clase}`}
              >
                <span className="text-base font-semibold text-ink">
                  {p.nombre}
                  {p.rol && <span className="ml-2 text-sm font-normal text-muted">{p.rol}</span>}
                </span>
                <span className="text-sm font-bold">{etiqueta}</span>
              </button>
            </li>
          );
        })}
        {personal?.length === 0 && (
          <li className="py-8 text-center text-muted">
            Todavía no hay nadie cargado en esta obra.
          </li>
        )}
      </ul>

      {altaAbierta ? (
        <form onSubmit={onAlta} className="flex flex-col gap-2 rounded-xl border-2 border-brand/40 p-4">
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre"
            className="min-h-12 rounded-lg border border-black/20 px-3 text-base"
          />
          <input
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            placeholder="Rol (opcional)"
            className="min-h-12 rounded-lg border border-black/20 px-3 text-base"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="min-h-12 flex-1 rounded-lg bg-brand font-bold text-white"
            >
              Agregar
            </button>
            <button
              type="button"
              onClick={() => setAltaAbierta(false)}
              className="min-h-12 rounded-lg px-4 font-semibold text-muted"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAltaAbierta(true)}
          className="min-h-12 rounded-xl border-2 border-dashed border-brand/50 font-bold text-brand"
        >
          + Persona
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verificar**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 4: Probar en dev**

Run: `npm run dev` y abrir `http://localhost:3000/campo/asistencia` (logueado).
Expected: lista del personal de la obra activa; tap cicla estados con colores; `+ Persona` agrega al instante; chip verde.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(app)/campo/asistencia/"
git commit -m "Fase 1: pantalla de asistencia en /campo/asistencia"
```

---

### Task 7: Home `/campo` con card de asistencia

**Files:**
- Modify: `src/app/(app)/campo/page.tsx` (reemplazo completo del placeholder)

- [ ] **Step 1: Reemplazar `src/app/(app)/campo/page.tsx`**

```tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

// Superficie mobile: capturar (asistencia, tareas, materiales, diario).
// Acá nunca se pide ni se muestra dinero.
// TODO Fase 1: gating por rol (campo entra directo acá; admin puede ir a ambas).
export default async function CampoPage() {
  const supabase = await createClient();

  const { data: obra } = await supabase
    .from("obras")
    .select("id, nombre")
    .eq("estado", "activa")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  let presentes = 0;
  let total = 0;
  if (obra) {
    const hoy = new Date().toISOString().slice(0, 10);
    const [{ count: nPresentes }, { count: nTotal }] = await Promise.all([
      supabase
        .from("asistencias")
        .select("id", { count: "exact", head: true })
        .eq("obra_id", obra.id)
        .eq("fecha", hoy),
      supabase
        .from("personal")
        .select("id", { count: "exact", head: true })
        .eq("obra_id", obra.id)
        .is("deleted_at", null),
    ]);
    presentes = nPresentes ?? 0;
    total = nTotal ?? 0;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-bold text-ink">
        HOY{obra && <span className="ml-2 text-base font-normal text-muted">{obra.nombre}</span>}
      </h1>

      {!obra ? (
        <p className="py-8 text-center text-muted">
          No hay ninguna obra activa. Creala desde la oficina.
        </p>
      ) : (
        <Link
          href="/campo/asistencia"
          className="flex min-h-20 items-center justify-between rounded-2xl border-2 border-brand/40 bg-brand/5 px-5"
        >
          <div className="flex flex-col">
            <span className="text-lg font-bold text-ink">Asistencia</span>
            <span className="text-sm text-muted">
              {presentes} de {total} marcados hoy
            </span>
          </div>
          <span className="text-2xl text-brand">→</span>
        </Link>
      )}

      <p className="text-center text-sm text-muted">
        Tareas, materiales y diario llegan en los próximos tramos.
      </p>
    </div>
  );
}
```

Nota: el conteo del server es aproximado si hay cola sin sincronizar — aceptable para la card; la verdad local vive en `/campo/asistencia`. (El mismo caveat del literal `"activa"` de Task 6 aplica acá.)

- [ ] **Step 2: Verificar**

Run: `npm run typecheck && npm run lint`
Expected: PASS.

- [ ] **Step 3: Probar en dev**

Abrir `http://localhost:3000/campo`.
Expected: card "Asistencia · X de N marcados hoy" que navega a la pantalla.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/campo/page.tsx"
git commit -m "Fase 1: home HOY de /campo con card de asistencia"
```

---

### Task 8: Verificación final + docs

**Files:**
- Modify: `tasks/todo.md` (marcar avance de Fase 1)
- Modify: `ARCHITECTURE.md` (sección cola offline: pasar de "convención" a "implementado en src/lib/offline/")

- [ ] **Step 1: Build de producción**

Run: `npm run build`
Expected: build verde sin warnings nuevos.

- [ ] **Step 2: Prueba manual offline (requiere migraciones aplicadas — `npx supabase db push` pendiente de Demian)**

1. `npm run build && npm start`, abrir `/campo/asistencia` con red y esperar hidratación.
2. DevTools → Network → Offline. Marcar 2 personas + alta de 1 persona. Chip: "Sin señal · 3".
3. Recargar la página (sigue offline): los estados persisten (espejo Dexie).
4. Volver a Online: chip pasa a "Sincronizado". Verificar en Supabase (Table Editor):
   filas en `asistencias` con `created_offline = true` y `captured_at` del momento del tap;
   fila nueva en `personal` con `obra_id` correcto.
5. Corrección: tap extra sobre una persona presente (→ medio día) y verificar que la fila
   remota se actualizó (mismo `id`, `medio_dia = true`).

- [ ] **Step 3: Actualizar `tasks/todo.md`**

En la sección "Fase 1 — Núcleo de campo", marcar la cola offline y el flujo de asistencia
como hechos, dejando explícito lo que falta (tareas, materiales, diario, /oficina, gating).

- [ ] **Step 4: Actualizar `ARCHITECTURE.md`**

En "Convenciones para la cola offline (Fase 1)", agregar al final:

```markdown
Implementación: `src/lib/offline/` — `db.ts` (Dexie: cola + espejo local), `sync.ts`
(drenado con upsert idempotente; `do update` en asistencias para permitir correcciones,
`do nothing` en inserts puros), `asistencia.ts` (dominio), `useCola.ts` + `ChipSync` (UI).
```

- [ ] **Step 5: Commit final**

```bash
git add tasks/todo.md ARCHITECTURE.md
git commit -m "Fase 1: asistencia + cola offline — docs y estado"
```
