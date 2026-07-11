import { createClient } from "@/lib/supabase/server";
import MaterialesClient from "./MaterialesClient";

// Server component: resuelve obra activa + datos frescos y se los pasa al
// cliente, que los espeja en Dexie. Sin red, el cliente opera solo con el espejo.
// Los materiales se leen de la tabla base (campo puede SELECT las filas vivas);
// los pedidos se leen de la vista sin costos `pedidos_materiales_campo`.
export default async function MaterialesPage() {
  const supabase = await createClient();

  const { data: obra } = await supabase
    .from("obras")
    .select("id, nombre")
    .eq("estado", "activa")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  if (!obra) {
    return (
      <div className="mx-auto max-w-md px-6 py-16 text-center text-muted">
        No hay ninguna obra activa. Creala desde la oficina.
      </div>
    );
  }

  const [{ data: materiales }, { data: pedidos }] = await Promise.all([
    supabase
      .from("materiales")
      .select("*")
      .eq("obra_id", obra.id)
      .is("deleted_at", null)
      .order("nombre"),
    // La vista ya filtra deleted_at y no expone columnas de costo.
    supabase
      .from("pedidos_materiales_campo")
      .select("*")
      .eq("obra_id", obra.id),
  ]);

  return (
    <MaterialesClient
      obraId={obra.id}
      materialesServidor={materiales ?? []}
      pedidosServidor={pedidos ?? []}
    />
  );
}
