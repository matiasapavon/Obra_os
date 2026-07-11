import { db, type DiarioRow, type FotoRow } from "./db";
import { encolar } from "./sync";
import { subirFotosPendientes } from "./fotos";
import { comprimirFoto } from "./comprimir";
import { fechaHoyISO } from "@/lib/format";

/**
 * Guarda una nota de diario (texto opcional + foto opcional). La fila JSON
 * sincroniza por la cola; el binario de la foto va por el canal aparte.
 * Si viene foto, su fila `fotos` nace con url=null y estado_upload='pendiente'
 * (el CHECK prohíbe 'subida' con url null); el uploader la completa después.
 */
export async function guardarNota(
  obraId: string,
  texto: string,
  fotoBlob?: Blob,
): Promise<void> {
  const ahora = new Date().toISOString();
  const hoy = fechaHoyISO();
  const id = crypto.randomUUID();

  const diario: DiarioRow = {
    id,
    obra_id: obraId,
    texto: texto || null,
    clima: null,
    etiquetas: [],
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
    texto: texto || null,
    fecha: hoy,
    captured_at: ahora,
    created_offline: true,
  });

  if (fotoBlob) {
    const fotoId = crypto.randomUUID();
    const foto: FotoRow = {
      id: fotoId,
      obra_id: obraId,
      diario_id: id,
      tarea_id: null,
      stock_evento_id: null,
      url: null,
      thumbnail_url: null,
      estado_upload: "pendiente",
      ubicacion_texto: null,
      fecha: hoy,
      captured_at: ahora,
      created_offline: true,
      created_at: ahora,
      updated_at: ahora,
      deleted_at: null,
    };
    await db.fotos.put(foto);
    const comprimida = await comprimirFoto(fotoBlob);
    await db.fotos_blobs.put({ id: fotoId, blob: comprimida, estado: "pendiente" });
    // estado_upload='pendiente' obligatorio: el CHECK prohíbe 'subida' con url null.
    await encolar("fotos", {
      id: fotoId,
      obra_id: obraId,
      diario_id: id,
      url: null,
      estado_upload: "pendiente",
      captured_at: ahora,
      created_offline: true,
    });
    void subirFotosPendientes();
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
