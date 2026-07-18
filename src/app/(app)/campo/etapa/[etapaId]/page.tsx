import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import { etapaEnFoco } from "@/lib/campo/etapa";
import VolverCampo from "@/components/VolverCampo";
import BotonTicket from "./BotonTicket";

// Hub de una etapa: desde acá cuelga toda la carga de campo (asistencia, tareas,
// materiales, diario), siempre imputada a esta etapa. Nunca muestra dinero.
const ESTADO_ETAPA: Record<string, { clase: string; etiqueta: string }> = {
  pendiente: { clase: "text-muted", etiqueta: "Pendiente" },
  en_curso: { clase: "text-warn", etiqueta: "En curso" },
  terminada: { clase: "text-ok", etiqueta: "Terminada" },
};

export default async function EtapaHubPage({
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

  // Gremio a cargo + avance (promedio de las tareas vivas de la etapa).
  const [{ data: gremio }, { data: tareas }] = await Promise.all([
    etapa.gremio_id
      ? supabase.from("gremios").select("nombre").eq("id", etapa.gremio_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("tareas")
      .select("porcentaje_avance")
      .eq("etapa_id", etapa.id)
      .eq("tipo", "obra") // las punch no cuentan para el avance
      .is("deleted_at", null),
  ]);

  const listaTareas = tareas ?? [];
  const avance =
    listaTareas.length > 0
      ? Math.round(
          listaTareas.reduce((s, t) => s + (t.porcentaje_avance ?? 0), 0) /
            listaTareas.length,
        )
      : null;
  const estado = ESTADO_ETAPA[etapa.estado] ?? ESTADO_ETAPA.pendiente;

  const base = `/campo/etapa/${etapa.id}`;
  const secciones = [
    { href: `${base}/asistencia`, emoji: "👷", titulo: "Asistencia", sub: "Quién vino hoy" },
    { href: `${base}/tareas`, emoji: "🔨", titulo: "Tareas", sub: "Avance del día" },
    { href: `${base}/materiales`, emoji: "📦", titulo: "Materiales", sub: "Falta / llegó" },
    { href: `${base}/diario`, emoji: "📝", titulo: "Diario", sub: "Nota y foto" },
    { href: `${base}/punch`, emoji: "🔧", titulo: "Punch", sub: "Pendientes de cierre" },
  ];

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-6">
      <div className="flex items-center gap-1">
        <VolverCampo />
        <h1 className="text-2xl font-bold text-ink">{etapa.nombre}</h1>
      </div>

      <div className="rounded-2xl border-2 border-line px-5 py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Gremio</span>
          <span className="font-semibold text-ink">
            {gremio?.nombre ?? "Sin asignar"}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-muted">Estado</span>
          <span className={`font-bold ${estado.clase}`}>{estado.etiqueta}</span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-muted">Avance</span>
          <span className="font-bold text-ink">
            {avance === null ? "—" : `${avance}%`}
          </span>
        </div>
      </div>

      {secciones.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          className="flex min-h-16 items-center justify-between rounded-2xl border-2 border-line px-5"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{c.emoji}</span>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-ink">{c.titulo}</span>
              <span className="text-sm text-muted">{c.sub}</span>
            </div>
          </div>
          <span className="text-2xl text-brand">→</span>
        </Link>
      ))}

      <BotonTicket obraId={obra.id} />
    </div>
  );
}
