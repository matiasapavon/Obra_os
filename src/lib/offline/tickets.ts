import { encolarFoto } from "./diario";

/**
 * Guarda la foto de un ticket/comprobante desde campo. El mobile nunca ve ni
 * pide montos: solo captura la imagen (tipo='ticket'); en oficina se crea el
 * gasto desde la foto y se le pone monto y rubro.
 */
export async function guardarTicket(obraId: string, blob: Blob): Promise<void> {
  await encolarFoto(obraId, blob, { tipo: "ticket" });
}
