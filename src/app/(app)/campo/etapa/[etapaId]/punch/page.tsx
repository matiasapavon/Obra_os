import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import { etapaEnFoco } from "@/lib/campo/etapa";
import PunchClient from "./PunchClient";

// Punch list de la etapa: defectos/pendientes de cierre con foto y gremio
// responsable. Nunca muestra dinero.
export default async function PunchPage({
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

  const [{ data: punch }, { data: gremios }] = await Promise.all([
    supabase
      .from("tareas")
      .select("*")
      .eq("obra_id", obra.id)
      .eq("etapa_id", etapa.id)
      .eq("tipo", "punch")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("gremios")
      .select("id, nombre")
      .is("deleted_at", null)
      .order("nombre", { ascending: true }),
  ]);

  return (
    <PunchClient
      obraId={obra.id}
      etapaId={etapa.id}
      punchServidor={punch ?? []}
      gremios={gremios ?? []}
    />
  );
}
