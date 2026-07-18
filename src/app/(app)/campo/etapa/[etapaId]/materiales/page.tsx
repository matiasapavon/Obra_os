import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import { etapaEnFoco } from "@/lib/campo/etapa";
import MaterialesClient from "../../../materiales/MaterialesClient";

// Materiales dentro de una etapa: la lista de materiales es de la obra; los
// pedidos que se marquen (falta/llegó) quedan imputados a esta etapa.
export default async function MaterialesEtapaPage({
  params,
}: {
  params: Promise<{ etapaId: string }>;
}) {
  const { etapaId } = await params;
  const supabase = await createClient();

  const obra = await obraActiva(supabase);
  if (!obra) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center text-muted">
        No hay ninguna obra activa. Creala desde la oficina.
      </div>
    );
  }
  const etapa = await etapaEnFoco(supabase, obra.id, etapaId);

  const [{ data: materiales }, { data: pedidos }] = await Promise.all([
    supabase
      .from("materiales")
      .select("*")
      .eq("obra_id", obra.id)
      .is("deleted_at", null)
      .order("nombre"),
    supabase
      .from("pedidos_materiales_campo")
      .select("*")
      .eq("obra_id", obra.id),
  ]);

  return (
    <MaterialesClient
      obraId={obra.id}
      etapaId={etapa.id}
      materialesServidor={materiales ?? []}
      pedidosServidor={pedidos ?? []}
    />
  );
}
