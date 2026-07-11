import { createClient } from "@/lib/supabase/server";
import TareasClient from "./TareasClient";

// Server component: resuelve obra activa + tareas frescas y se las pasa al
// cliente, que las espeja en Dexie. Sin red, el cliente opera solo con el espejo.
export default async function TareasPage() {
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

  const { data: tareas } = await supabase
    .from("tareas")
    .select("*")
    .eq("obra_id", obra.id)
    .is("deleted_at", null)
    .neq("estado", "terminada")
    .order("orden");

  return <TareasClient obraId={obra.id} tareasServidor={tareas ?? []} />;
}
