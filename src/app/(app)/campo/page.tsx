import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { fechaHoyISO } from "@/lib/format";

// Superficie mobile: capturar (asistencia, tareas, materiales, diario).
// Acá nunca se pide ni se muestra dinero.
// TODO Fase 1: gating por rol (campo entra directo acá; admin puede ir a ambas).
export default async function CampoPage() {
  const supabase = await createClient();

  const { data: obra } = await supabase
    .from("obras")
    .select("id, nombre")
    .eq("estado", "activa")
    .is("deleted_at", null)
    .limit(1)
    .maybeSingle();

  let presentes = 0;
  let total = 0;
  if (obra) {
    const hoy = fechaHoyISO();
    const [{ count: nPresentes }, { count: nTotal }] = await Promise.all([
      supabase
        .from("asistencias")
        .select("id", { count: "exact", head: true })
        .eq("obra_id", obra.id)
        .eq("fecha", hoy)
        .is("deleted_at", null),
      supabase
        .from("personal")
        .select("id", { count: "exact", head: true })
        .eq("obra_id", obra.id)
        .is("deleted_at", null),
    ]);
    presentes = nPresentes ?? 0;
    total = nTotal ?? 0;
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-4 px-4 py-6">
      <h1 className="text-2xl font-bold text-ink">
        HOY{obra && <span className="ml-2 text-base font-normal text-muted">{obra.nombre}</span>}
      </h1>

      {!obra ? (
        <p className="py-8 text-center text-muted">
          No hay ninguna obra activa. Creala desde la oficina.
        </p>
      ) : (
        <Link
          href="/campo/asistencia"
          className="flex min-h-20 items-center justify-between rounded-2xl border-2 border-brand/40 bg-brand/5 px-5"
        >
          <div className="flex flex-col">
            <span className="text-lg font-bold text-ink">Asistencia</span>
            <span className="text-sm text-muted">
              {presentes} de {total} marcados hoy
            </span>
          </div>
          <span className="text-2xl text-brand">→</span>
        </Link>
      )}

      <p className="text-center text-sm text-muted">
        Tareas, materiales y diario llegan en los próximos tramos.
      </p>
    </div>
  );
}
