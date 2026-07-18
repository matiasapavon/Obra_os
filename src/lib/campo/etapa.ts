import { redirect } from "next/navigation";
import type { createClient } from "@/lib/supabase/server";

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

export type EtapaEnFoco = {
  id: string;
  nombre: string;
  obra_id: string;
  estado: string;
  gremio_id: string | null;
};

// Resuelve la etapa de la URL y valida que pertenezca a la obra en foco. Si no
// existe, está borrada o es de otra obra (p. ej. quedó una URL vieja tras cambiar
// de obra) → redirige a /campo. Así la etapa activa se invalida sola, sin cookie.
export async function etapaEnFoco(
  supabase: SupabaseServer,
  obraId: string,
  etapaId: string,
): Promise<EtapaEnFoco> {
  const { data } = await supabase
    .from("etapas")
    .select("id, nombre, obra_id, estado, gremio_id")
    .eq("id", etapaId)
    .is("deleted_at", null)
    .maybeSingle();

  if (!data || data.obra_id !== obraId) redirect("/campo");
  return data;
}
