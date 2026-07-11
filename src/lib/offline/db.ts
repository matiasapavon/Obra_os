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
