import Dexie, { type EntityTable } from "dexie";
import type { Database } from "@/lib/supabase/database.types";

// Tablas remotas que la cola sabe sincronizar (crece en próximos tramos).
export type TablaSincronizable =
  | "asistencias"
  | "personal"
  | "tareas"
  | "materiales"
  | "pedidos_materiales"
  | "diario_obra"
  | "fotos";

export type AsistenciaRow = Database["public"]["Tables"]["asistencias"]["Row"];
export type PersonalRow = Database["public"]["Tables"]["personal"]["Row"];
export type TareaRow = Database["public"]["Tables"]["tareas"]["Row"];
export type MaterialRow = Database["public"]["Tables"]["materiales"]["Row"];
export type DiarioRow = Database["public"]["Tables"]["diario_obra"]["Row"];
export type FotoRow = Database["public"]["Tables"]["fotos"]["Row"];
// Campo lee pedidos por la vista sin costos (la tabla base es admin-only al SELECT).
export type PedidoCampoRow = Database["public"]["Views"]["pedidos_materiales_campo"]["Row"];

// El binario de una foto vive local en su propio store (fuera de la cola JSON):
// se sube a Storage por un canal aparte. id = el id de la foto.
export interface FotoBlob {
  id: string;
  blob: Blob;
  estado: "pendiente" | "error";
}

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
  materiales: EntityTable<MaterialRow, "id">;
  pedidos_campo: EntityTable<PedidoCampoRow, "id">;
  diario_hoy: EntityTable<DiarioRow, "id">;
  fotos: EntityTable<FotoRow, "id">;
  fotos_blobs: EntityTable<FotoBlob, "id">;
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

// v3: agrega los espejos de materiales y pedidos de campo. Migración aditiva:
// se listan TODOS los stores previos (v1 + v2) más los nuevos.
db.version(3).stores({
  cola: "id, estado, tabla",
  personal: "id, obra_id",
  asistencias_hoy: "id, personal_id",
  tareas_hoy: "id, obra_id",
  materiales: "id, obra_id",
  pedidos_campo: "id, obra_id, material_id",
});

// v4: agrega el espejo del diario de hoy, el espejo de fotos y el store local de
// blobs (canal binario). Migración aditiva: se listan TODOS los stores previos
// (v1 + v2 + v3) más los nuevos.
db.version(4).stores({
  cola: "id, estado, tabla",
  personal: "id, obra_id",
  asistencias_hoy: "id, personal_id",
  tareas_hoy: "id, obra_id",
  materiales: "id, obra_id",
  pedidos_campo: "id, obra_id, material_id",
  diario_hoy: "id, obra_id",
  fotos: "id, diario_id, estado_upload",
  fotos_blobs: "id, estado",
});

export { db };
