import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import { etapaEnFoco } from "@/lib/campo/etapa";
import { fechaHoyISO } from "@/lib/format";
import AsistenciaClient from "../../../asistencia/AsistenciaClient";

// Asistencia dentro de una etapa: el personal y las marcas son de la obra
// (una persona marca una vez por día); la marca queda imputada a esta etapa.
export default async function AsistenciaEtapaPage({
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
      etapaId={etapa.id}
      personalServidor={personal ?? []}
      asistenciasServidor={asistencias ?? []}
    />
  );
}
