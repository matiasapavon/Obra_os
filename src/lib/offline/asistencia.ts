import { db, type AsistenciaRow, type PersonalRow } from "./db";
import { encolar } from "./sync";
import { fechaHoyISO } from "@/lib/format";

export type EstadoAsistencia = "pendiente" | "presente" | "medio" | "ausente";

export const SIGUIENTE_ESTADO: Record<EstadoAsistencia, EstadoAsistencia> = {
  pendiente: "presente",
  presente: "medio",
  medio: "ausente",
  ausente: "presente",
};

export function estadoDeFila(fila: AsistenciaRow | undefined): EstadoAsistencia {
  if (!fila) return "pendiente";
  if (fila.deleted_at) return "ausente";
  return fila.medio_dia ? "medio" : "presente";
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
    fecha: filaPrevia?.fecha ?? fechaHoyISO(),
    medio_dia: estado === "medio",
    hora_entrada: null,
    hora_salida: null,
    observacion: null,
    created_offline: true,
    captured_at: filaPrevia?.captured_at ?? ahora,
    created_at: filaPrevia?.created_at ?? ahora,
    updated_at: ahora,
    deleted_at: estado === "ausente" ? ahora : null,
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
