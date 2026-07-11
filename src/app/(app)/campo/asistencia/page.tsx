import { createClient } from "@/lib/supabase/server";
import { fechaHoyISO } from "@/lib/format";
import AsistenciaClient from "./AsistenciaClient";

// Server component: resuelve obra activa + datos frescos y se los pasa al
// cliente, que los espeja en Dexie. Sin red, el cliente opera solo con el espejo.
export default async function AsistenciaPage() {
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

  const hoy = fechaHoyISO();
  const [{ data: personal }, { data: asistencias }] = await Promise.all([
    supabase
      .from("personal")
      .select("*")
      .eq("obra_id", obra.id)
      .is("deleted_at", null)
      .order("nombre"),
    supabase
      .from("asistencias")
      .select("*")
      .eq("obra_id", obra.id)
      .eq("fecha", hoy),
  ]);

  return (
    <AsistenciaClient
      obraId={obra.id}
      personalServidor={personal ?? []}
      asistenciasServidor={asistencias ?? []}
    />
  );
}
