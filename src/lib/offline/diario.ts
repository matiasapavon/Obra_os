import { db, type DiarioRow, type FotoRow } from "./db";
import { encolar } from "./sync";
import { subirFotosPendientes } from "./fotos";
import { comprimirFoto } from "./comprimir";
import { fechaHoyISO } from "@/lib/format";

/**
 * Encola una foto (fila + binario) por el doble canal offline. La fila `fotos`
 * nace con url=null y estado_upload='pendiente' (el CHECK prohíbe 'subida' con
 * url null); el uploader la completa después. Compartido por diario, tickets
 * de gastos y punch list — el destino se elige con las FKs/tipo.
 */
export async function encolarFoto(
  obraId: string,
  blob: Blob,
  destino: { diario_id?: string; tarea_id?: string; tipo?: "obra" | "ticket" },
): Promise<void> {
  const ahora = new Date().toISOString();
  const fotoId = crypto.randomUUID();
  const foto: FotoRow = {
    id: fotoId,
    obra_id: obraId,
    diario_id: destino.diario_id ?? null,
    tarea_id: destino.tarea_id ?? null,
    stock_evento_id: null,
    tipo: destino.tipo ?? "obra",
    gasto_id: null,
    url: null,
    thumbnail_url: null,
    estado_upload: "pendiente",
    ubicacion_texto: null,
    fecha: fechaHoyISO(),
    captured_at: ahora,
    created_offline: true,
    created_at: ahora,
    updated_at: ahora,
    deleted_at: null,
  };
  await db.fotos.put(foto);
  const comprimida = await comprimirFoto(blob);
  await db.fotos_blobs.put({ id: fotoId, blob: comprimida, estado: "pendiente" });
  // estado_upload='pendiente' obligatorio: el CHECK prohíbe 'subida' con url null.
  await encolar("fotos", {
    id: fotoId,
    obra_id: obraId,
    diario_id: destino.diario_id ?? null,
    tarea_id: destino.tarea_id ?? null,
    tipo: destino.tipo ?? "obra",
    url: null,
    estado_upload: "pendiente",
    captured_at: ahora,
    created_offline: true,
  });
  void subirFotosPendientes();
}

/**
 * Guarda una nota de diario (texto opcional + foto opcional + clima/etiquetas
 * opcionales). La fila JSON sincroniza por la cola; el binario de la foto va
 * por el canal aparte. El clima llega ya resuelto (best-effort, puede ser null).
 */
export async function guardarNota(
  obraId: string,
  etapaId: string,
  texto: string,
  fotoBlob?: Blob,
  extras?: { clima?: string | null; etiquetas?: string[] },
): Promise<void> {
  const ahora = new Date().toISOString();
  const hoy = fechaHoyISO();
  const id = crypto.randomUUID();
  const clima = extras?.clima ?? null;
  const etiquetas = extras?.etiquetas ?? [];

  const diario: DiarioRow = {
    id,
    obra_id: obraId,
    etapa_id: etapaId,
    texto: texto || null,
    clima,
    etiquetas,
    fecha: hoy,
    captured_at: ahora,
    created_offline: true,
    created_at: ahora,
    updated_at: ahora,
    deleted_at: null,
  };
  await db.diario_hoy.put(diario);
  await encolar("diario_obra", {
    id,
    obra_id: obraId,
    etapa_id: etapaId,
    texto: texto || null,
    clima,
    etiquetas,
    fecha: hoy,
    captured_at: ahora,
    created_offline: true,
  });

  if (fotoBlob) {
    await encolarFoto(obraId, fotoBlob, { diario_id: id });
  }
}

/** Hidrata el espejo del diario de hoy (pisa lo del server, respeta la cola). */
export async function hidratarDiario(diarios: DiarioRow[]): Promise<void> {
  await db.transaction("rw", db.cola, db.diario_hoy, async () => {
    // No pisar notas creadas offline que todavía no sincronizaron.
    const idsEnCola = new Set((await db.cola.toArray()).map((i) => i.id));
    await db.diario_hoy.where("id").noneOf([...idsEnCola]).delete();
    await db.diario_hoy.bulkPut(diarios.filter((d) => !idsEnCola.has(d.id)));
  });
}
