import Dexie, { type EntityTable } from "dexie";
import type { Database } from "@/lib/supabase/database.types";

// Tablas remotas que la cola sabe sincronizar (crece en próximos tramos).
export type TablaSincronizable =
  | "asistencias"
  | "personal"
  | "tareas"
  | "pedidos_materiales"
  | "diario_obra"
  | "fotos";

export type AsistenciaRow = Database["public"]["Tables"]["asistencias"]["Row"];
export type PersonalRow = Database["public"]["Tables"]["personal"]["Row"];
export type TareaRow = Database["public"]["Tables"]["tareas"]["Row"];

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
  tareas_hoy: EntityTable<TareaRow, "id">;
};

db.version(1).stores({
  cola: "id, estado, tabla",
  personal: "id, obra_id",
  asistencias_hoy: "id, personal_id",
});

// v2: agrega el espejo de tareas. Dexie migra aditivamente; se listan TODOS los
// stores (los de v1 más el nuevo) para no borrar los existentes.
db.version(2).stores({
  cola: "id, estado, tabla",
  personal: "id, obra_id",
  asistencias_hoy: "id, personal_id",
  tareas_hoy: "id, obra_id",
});

export { db };
