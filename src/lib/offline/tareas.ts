import { db, type TareaRow } from "./db";
import { encolar } from "./sync";
import { encolarFoto } from "./diario";

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

/**
 * Crea un ítem de punch list (defecto/pendiente de cierre) desde campo:
 * tarea tipo='punch' con foto opcional. No aparece en la lista normal de
 * tareas ni cuenta para el avance de obra.
 */
export async function crearPunch(
  obraId: string,
  etapaId: string,
  nombre: string,
  gremioId?: string | null,
  fotoBlob?: Blob,
): Promise<void> {
  const ahora = new Date().toISOString();
  const id = crypto.randomUUID();
  const fila: TareaRow = {
    id,
    obra_id: obraId,
    etapa_id: etapaId,
    rubro_id: null,
    gremio_id: gremioId ?? null,
    nombre,
    descripcion: null,
    ubicacion: null,
    tipo: "punch",
    estado: "pendiente",
    porcentaje_avance: 0,
    orden: 0,
    fecha_inicio_plan: null,
    fecha_fin_plan: null,
    fecha_inicio_real: null,
    fecha_fin_real: null,
    captured_at: ahora,
    created_offline: true,
    created_at: ahora,
    updated_at: ahora,
    deleted_at: null,
  };
  await db.tareas_hoy.put(fila);
  await encolar("tareas", {
    id,
    obra_id: obraId,
    etapa_id: etapaId,
    gremio_id: gremioId ?? null,
    nombre,
    tipo: "punch",
    estado: "pendiente",
    porcentaje_avance: 0,
    captured_at: ahora,
    created_offline: true,
  });
  if (fotoBlob) {
    await encolarFoto(obraId, fotoBlob, { tarea_id: id });
  }
}

/** Hidrata el espejo de tareas (pisa, respetando lo que aún está en la cola). */
export async function hidratarTareas(tareas: TareaRow[]): Promise<void> {
  await db.transaction("rw", db.cola, db.tareas_hoy, async () => {
    const idsEnCola = new Set((await db.cola.toArray()).map((i) => i.id));
    await db.tareas_hoy.where("id").noneOf([...idsEnCola]).delete();
    await db.tareas_hoy.bulkPut(tareas.filter((t) => !idsEnCola.has(t.id)));
  });
}
