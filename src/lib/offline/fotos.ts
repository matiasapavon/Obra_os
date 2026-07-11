import { createClient } from "@/lib/supabase/client";
import { db } from "./db";
import { encolar } from "./sync";

// Bucket de Storage donde viven las fotos de obra.
const BUCKET = "fotos-obra";

let subiendo = false;

/**
 * Canal binario: sube a Storage los blobs de fotos pendientes (separado de la
 * cola JSON). Best-effort: si el bucket no existe o hay red intermitente, cada
 * foto queda en 'error' o 'pendiente' sin frenar a las demás ni tirar.
 *
 * Éxito de una foto: sube el blob, obtiene la URL pública, encola la fila `fotos`
 * (do-update) con url + estado_upload='subida', borra el blob local y actualiza
 * el espejo. La fila JSON sincroniza por la cola ordenada (padre diario primero).
 */
export async function subirFotosPendientes(): Promise<void> {
  if (subiendo || !navigator.onLine) return;
  subiendo = true;
  try {
    const supabase = createClient();
    const pendientes = await db.fotos_blobs.where("estado").equals("pendiente").toArray();
    for (const blob of pendientes) {
      try {
        // El obra_id vive en el espejo de la foto (NOT NULL para el upsert).
        const foto = await db.fotos.get(blob.id);
        if (!foto) continue; // huérfano: sin fila espejo no hay obra_id ni ruta.
        const path = `${foto.obra_id}/${blob.id}.jpg`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(path, blob.blob, {
            upsert: true,
            contentType: blob.blob.type || "image/jpeg",
          });
        if (error) {
          // Rechazo real (bucket ausente, permisos): marcar error y seguir.
          await db.fotos_blobs.update(blob.id, { estado: "error" });
          continue;
        }
        const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
        const url = pub.publicUrl;
        // Re-incluye obra_id (NOT NULL) porque el upsert valida la rama INSERT.
        await encolar("fotos", {
          id: blob.id,
          obra_id: foto.obra_id,
          url,
          estado_upload: "subida",
        });
        await db.fotos_blobs.delete(blob.id);
        await db.fotos.put({ ...foto, url, estado_upload: "subida" });
      } catch {
        // Throw de red a mitad de una foto: se deja 'pendiente' para reintentar.
      }
    }
  } catch {
    // Red caída antes de arrancar: los blobs quedan pendientes.
  } finally {
    subiendo = false;
  }
}
