import { createClient } from "@/lib/supabase/server";
import { fechaHoyISO } from "@/lib/format";
import DiarioClient from "./DiarioClient";

// Server component: resuelve obra activa + notas de hoy y las pasa al cliente,
// que las espeja en Dexie. Sin red, el cliente opera solo con el espejo.
export default async function DiarioPage() {
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
  const { data: diarios } = await supabase
    .from("diario_obra")
    .select("*")
    .eq("obra_id", obra.id)
    .eq("fecha", hoy)
    .is("deleted_at", null)
    .order("captured_at", { ascending: false });

  return <DiarioClient obraId={obra.id} diariosServidor={diarios ?? []} />;
}
