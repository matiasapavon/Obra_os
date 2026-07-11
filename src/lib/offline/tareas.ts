import { db, type TareaRow } from "./db";
import { encolar } from "./sync";

export function estadoDeAvance(pct: number): TareaRow["estado"] {
  if (pct <= 0) return "pendiente";
  if (pct >= 100) return "terminada";
  return "en_curso";
}

/** Actualiza el avance de una tarea existente (update; la fila ya existe en la nube). */
export async function marcarAvance(tarea: TareaRow, porcentaje: number): Promise<void> {
  const pct = Math.max(0, Math.min(100, Math.round(porcentaje)));
  const fila: TareaRow = {
    ...tarea,
    porcentaje_avance: pct,
    estado: estadoDeAvance(pct),
    updated_at: new Date().toISOString(),
  };
  await db.tareas_hoy.put(fila);
  // Payload de upsert: incluye columnas NOT NULL (obra_id, nombre) porque el
  // INSERT del upsert las valida antes de resolver el conflicto. No mandar
  // created_at/updated_at (trigger) ni created_offline (la tarea no nació offline).
  await encolar("tareas", {
    id: fila.id,
    obra_id: fila.obra_id,
    nombre: fila.nombre,
    porcentaje_avance: fila.porcentaje_avance,
    estado: fila.estado,
  });
}

/** Hidrata el espejo de tareas (pisa, respetando lo que aún está en la cola). */
export async function hidratarTareas(tareas: TareaRow[]): Promise<void> {
  await db.transaction("rw", db.cola, db.tareas_hoy, async () => {
    const idsEnCola = new Set((await db.cola.toArray()).map((i) => i.id));
    await db.tareas_hoy.where("id").noneOf([...idsEnCola]).delete();
    await db.tareas_hoy.bulkPut(tareas.filter((t) => !idsEnCola.has(t.id)));
  });
}
