import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import { etapaEnFoco } from "@/lib/campo/etapa";
import { fechaHoyISO } from "@/lib/format";
import DiarioClient from "../../../diario/DiarioClient";

// Diario de una etapa: las notas de hoy imputadas a esta etapa.
export default async function DiarioEtapaPage({
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

  const hoy = fechaHoyISO();
  const { data: diarios } = await supabase
    .from("diario_obra")
    .select("*")
    .eq("obra_id", obra.id)
    .eq("etapa_id", etapa.id)
    .eq("fecha", hoy)
    .is("deleted_at", null)
    .order("captured_at", { ascending: false });

  return (
    <DiarioClient obraId={obra.id} etapaId={etapa.id} diariosServidor={diarios ?? []} />
  );
}
