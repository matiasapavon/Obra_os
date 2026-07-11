import { createClient } from "@/lib/supabase/client";
import { db, type ItemCola, type TablaSincronizable } from "./db";

// `do update` para poder corregir un tap (mismo id, payload nuevo);
// `do nothing` (ignoreDuplicates) para inserts puros como personal.
const OPCIONES_UPSERT: Record<TablaSincronizable, { ignoreDuplicates: boolean }> = {
  asistencias: { ignoreDuplicates: false },
  personal: { ignoreDuplicates: true },
  tareas: { ignoreDuplicates: false },
  materiales: { ignoreDuplicates: true },
  pedidos_materiales: { ignoreDuplicates: false },
  diario_obra: { ignoreDuplicates: false },
  fotos: { ignoreDuplicates: false },
};

let sincronizando = false;

// Suscriptores que corren después de cada drenado limpio de la cola (p. ej. el
// uploader de fotos). Registro de una sola dirección: sync.ts NO importa fotos.ts,
// así que no hay ciclo (fotos.ts sí importa encolar/alDrenar de acá).
type Suscriptor = () => void | Promise<void>;
const suscriptoresDrenado: Suscriptor[] = [];

/** Registra un callback a correr tras cada drenado exitoso (idempotente). */
export function alDrenar(cb: Suscriptor): void {
  if (!suscriptoresDrenado.includes(cb)) suscriptoresDrenado.push(cb);
}

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
    // Loop: si encolar() corre durante un drenado, su trigger muere en el guard
    // de arriba; releer pendientes antes de soltar el guard levanta esos ítems.
    // Los fallidos pasan a 'error' (no 'pendiente'), así que el loop termina.
    for (;;) {
      // Orden por captura: garantiza FK safety cuando un tramo encola padre→hijo
      // (p. ej. diario_obra antes que su foto).
      const pendientes = await db.cola
        .where("estado")
        .equals("pendiente")
        .sortBy("capturado_en");
      if (pendientes.length === 0) {
        // Cola limpia: disparar los canales diferidos (subir fotos pendientes).
        for (const cb of suscriptoresDrenado) void cb();
        break;
      }
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
