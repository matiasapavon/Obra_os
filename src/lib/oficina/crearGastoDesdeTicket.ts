"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Crea un gasto a partir de la foto de un ticket sacada en campo y linkea el
// puente fotos.gasto_id. El gasto nace en "Sin clasificar" con monto 0 y el
// comprobante adjunto: monto y rubro se completan con la foto a la vista.
// Idempotente por foto: si el ticket ya tiene gasto_id, no crea otro.
export async function crearGastoDesdeTicket(
  fotoId: string,
): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient();

  // Defensa en profundidad: re-chequear admin (no confiar solo en el layout).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "No autenticado" };
  const { data: perfil } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (perfil?.role !== "admin") return { ok: false, error: "No autorizado" };

  const { data: foto } = await supabase
    .from("fotos")
    .select("id, obra_id, tipo, gasto_id, url, fecha")
    .eq("id", fotoId)
    .maybeSingle();
  if (!foto) return { ok: false, error: "Ticket no encontrado" };
  if (foto.tipo !== "ticket") return { ok: false, error: "La foto no es un ticket" };
  if (foto.gasto_id) return { ok: false, error: "El ticket ya tiene un gasto" };
  if (!foto.url) return { ok: false, error: "El ticket todavía no terminó de subir" };

  const { data: sistema } = await supabase
    .from("rubros")
    .select("id")
    .eq("obra_id", foto.obra_id)
    .eq("es_sistema", true)
    .maybeSingle();
  if (!sistema) return { ok: false, error: "La obra no tiene rubro Sin clasificar" };

  const { data: gasto, error: errorGasto } = await supabase
    .from("gastos")
    .insert({
      obra_id: foto.obra_id,
      rubro_id: sistema.id,
      concepto: "Ticket de campo",
      monto: 0,
      comprobante_url: foto.url,
      fecha: foto.fecha,
    })
    .select("id")
    .single();
  if (errorGasto || !gasto) {
    return { ok: false, error: errorGasto?.message ?? "No se pudo crear el gasto" };
  }

  const { error: errorLink } = await supabase
    .from("fotos")
    .update({ gasto_id: gasto.id })
    .eq("id", fotoId);
  if (errorLink) return { ok: false, error: errorLink.message };

  revalidatePath("/oficina/gastos");
  return { ok: true };
}
