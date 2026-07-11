// Compresión de fotos en el cliente antes de guardarlas en IndexedDB y subirlas.
// Fotos de celular en obra suelen pesar 3–8 MB; con red de obra eso mata la
// sincronización. Se re-encodea a JPEG acotando el lado mayor.

const LADO_MAX = 1600;
const CALIDAD = 0.8;

/**
 * Redimensiona y re-encodea la foto a JPEG (lado mayor ≤1600px, calidad 0,8).
 * Best-effort: ante cualquier fallo (formato raro, canvas sin contexto)
 * devuelve el blob original — mejor una foto pesada que ninguna.
 */
export async function comprimirFoto(original: Blob): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(original);
    const escala = Math.min(1, LADO_MAX / Math.max(bitmap.width, bitmap.height));
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) return original;
    ctx.drawImage(bitmap, 0, 0, ancho, alto);
    bitmap.close();

    const jpeg = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", CALIDAD),
    );
    // Si la compresión no achicó (foto ya liviana), quedarse con la original.
    return jpeg && jpeg.size < original.size ? jpeg : original;
  } catch {
    return original;
  }
}
