import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import { etapaEnFoco } from "@/lib/campo/etapa";
import TareasClient from "../../../tareas/TareasClient";

// Tareas de una etapa: solo las tareas imputadas a esta etapa (no terminadas).
export default async function TareasEtapaPage({
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

  const { data: tareas } = await supabase
    .from("tareas")
    .select("*")
    .eq("obra_id", obra.id)
    .eq("etapa_id", etapa.id)
    .is("deleted_at", null)
    .neq("estado", "terminada")
    .order("orden");

  return (
    <TareasClient obraId={obra.id} etapaId={etapa.id} tareasServidor={tareas ?? []} />
  );
}
