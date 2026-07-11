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
