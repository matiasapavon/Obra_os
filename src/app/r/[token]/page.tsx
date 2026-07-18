import { notFound } from "next/navigation";
import { createServiceClient } from "@/lib/supabase/service";
import { formatFechaCorta } from "@/lib/format";

// Reporte de avance para el cliente de la obra: página pública por capability
// token (obras.token_reporte), solo lectura, SIN PLATA. Nunca consulta
// gastos/rubros/compromisos/adicionales/ingresos. Se comparte por WhatsApp.
export const revalidate = 3600;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ReporteClientePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!UUID_RE.test(token)) notFound();

  const supabase = createServiceClient();

  const { data: obra } = await supabase
    .from("obras")
    .select("id, nombre, direccion, estado, fecha_inicio, fecha_fin_estimada")
    .eq("token_reporte", token)
    .is("deleted_at", null)
    .maybeSingle();
  if (!obra) notFound();

  const hace7 = new Date();
  hace7.setDate(hace7.getDate() - 7);
  const desde = hace7.toISOString().slice(0, 10);

  const [{ data: tareas }, { data: etapas }, { data: fotos }, { data: notas }] =
    await Promise.all([
      supabase
        .from("tareas")
        .select("porcentaje_avance, estado")
        .eq("obra_id", obra.id)
        .eq("tipo", "obra")
        .is("deleted_at", null),
      supabase
        .from("etapas")
        .select("nombre, orden, estado")
        .eq("obra_id", obra.id)
        .is("deleted_at", null)
        .order("orden", { ascending: true }),
      supabase
        .from("fotos")
        .select("id, url, fecha")
        .eq("obra_id", obra.id)
        .eq("tipo", "obra")
        .eq("estado_upload", "subida")
        .gte("fecha", desde)
        .is("deleted_at", null)
        .order("fecha", { ascending: false })
        .limit(12),
      supabase
        .from("diario_obra")
        .select("id, fecha, texto, etiquetas")
        .eq("obra_id", obra.id)
        .gte("fecha", desde)
        .not("texto", "is", null)
        .is("deleted_at", null)
        .order("fecha", { ascending: false }),
    ]);

  const vivas = tareas ?? [];
  const avance =
    vivas.length > 0
      ? Math.round(
          vivas.reduce((acc, t) => acc + t.porcentaje_avance, 0) / vivas.length,
        )
      : 0;
  const enCurso = (etapas ?? []).filter((e) => e.estado === "en_curso");
  // Solo notas "para el cliente": sin incidentes ni trabajos extra (esos se
  // conversan en persona, no por link).
  const notasVisibles = (notas ?? []).filter(
    (n) => !n.etiquetas.includes("incidente") && !n.etiquetas.includes("extra"),
  );

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 px-5 py-8">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-muted">
          Reporte de obra
        </p>
        <h1 className="text-3xl font-bold text-ink">{obra.nombre}</h1>
        {obra.direccion && <p className="text-muted">{obra.direccion}</p>}
      </header>

      <section className="rounded-2xl border-2 border-line p-5">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Avance general
          </h2>
          <span className="text-3xl font-bold tabular-nums text-ink">
            {avance}%
          </span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-surface">
          <div
            className="h-full rounded-full bg-brand"
            style={{ width: `${Math.min(100, Math.max(0, avance))}%` }}
          />
        </div>
        {enCurso.length > 0 && (
          <p className="mt-3 text-sm text-muted">
            En curso: {enCurso.map((e) => e.nombre).join(", ")}
          </p>
        )}
      </section>

      {(fotos ?? []).length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Fotos de la semana
          </h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(fotos ?? []).map((f) =>
              f.url ? (
                <a key={f.id} href={f.url} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.url}
                    alt={`Foto de obra del ${formatFechaCorta(f.fecha)}`}
                    className="aspect-square w-full rounded-xl border border-line object-cover"
                  />
                </a>
              ) : null,
            )}
          </div>
        </section>
      )}

      {notasVisibles.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
            Novedades de la semana
          </h2>
          <ul className="flex flex-col gap-2">
            {notasVisibles.map((n) => (
              <li
                key={n.id}
                className="rounded-xl border border-line px-4 py-3"
              >
                <p className="whitespace-pre-wrap text-ink">{n.texto}</p>
                <p className="mt-1 text-sm text-muted">
                  {formatFechaCorta(n.fecha)}
                </p>
              </li>
            ))}
          </ul>
        </section>
      )}

      <footer className="border-t border-line pt-4 text-center text-sm text-muted">
        Reporte generado por Obra OS · se actualiza solo
      </footer>
    </main>
  );
}
