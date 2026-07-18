"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { fechaHoyISO } from "@/lib/format";

// Crea un gasto a partir de un pedido de materiales y linkea el pedido al gasto
// (puente pedidos_materiales.gasto_id). El gasto nace imputado a "Sin clasificar",
// con el nombre del material como concepto y el costo real (o estimado) como monto.
// Idempotente por pedido: si el pedido ya tiene gasto_id, no crea otro.
export async function crearGastoDesdePedido(
  pedidoId: string,
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

  const { data: pedido } = await supabase
    .from("pedidos_materiales")
    .select("id, obra_id, gasto_id, costo_real, costo_estimado, materiales(nombre)")
    .eq("id", pedidoId)
    .maybeSingle();
  if (!pedido) return { ok: false, error: "Pedido no encontrado" };
  if (pedido.gasto_id) return { ok: false, error: "El pedido ya tiene un gasto" };

  const { data: sistema } = await supabase
    .from("rubros")
    .select("id")
    .eq("obra_id", pedido.obra_id)
    .eq("es_sistema", true)
    .maybeSingle();
  if (!sistema) return { ok: false, error: "La obra no tiene rubro Sin clasificar" };

  const concepto = pedido.materiales?.nombre ?? "Material";
  const monto = pedido.costo_real ?? pedido.costo_estimado ?? 0;

  const { data: gasto, error: errorGasto } = await supabase
    .from("gastos")
    .insert({
      obra_id: pedido.obra_id,
      rubro_id: sistema.id,
      concepto,
      monto,
      tipo: "material",
      fecha: fechaHoyISO(),
    })
    .select("id")
    .single();
  if (errorGasto || !gasto) {
    return { ok: false, error: errorGasto?.message ?? "No se pudo crear el gasto" };
  }

  const { error: errorLink } = await supabase
    .from("pedidos_materiales")
    .update({ gasto_id: gasto.id })
    .eq("id", pedidoId);
  if (errorLink) return { ok: false, error: errorLink.message };

  revalidatePath("/oficina/materiales");
  revalidatePath("/oficina/gastos");
  return { ok: true };
}
