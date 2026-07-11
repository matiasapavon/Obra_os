import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import { fechaHoyISO, formatFecha } from "@/lib/format";

// Vista de alertas: junta todo lo que necesita acción o atención en una sola
// lista, calculada al momento (sin tabla de avisos persistida — simplicidad).
type Alerta = {
  id: string;
  nivel: "alert" | "warn";
  titulo: string;
  detalle: string;
};

// Fecha ISO menos N días: el inicio de la ventana de aviso.
function inicioVentana(iso: string, dias: number): string {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() - dias);
  return d.toISOString().slice(0, 10);
}

const DIAS_AVISO_DOCS = 30;

export default async function AlertasPage() {
  const supabase = await createClient();
  const obra = await obraActiva(supabase);
  if (!obra) {
    return <p className="py-8 text-muted">No hay ninguna obra activa.</p>;
  }

  const hoy = fechaHoyISO();
  const [{ data: vencimientos }, { data: personal }, { data: pedidos }, { data: tareas }] =
    await Promise.all([
      supabase
        .from("vencimientos_admin")
        .select("*")
        .eq("obra_id", obra.id)
        .eq("estado", "pendiente")
        .is("deleted_at", null)
        .order("fecha_vencimiento", { ascending: true }),
      supabase
        .from("personal")
        .select("id, nombre, art_vencimiento, seguro_vencimiento")
        .eq("obra_id", obra.id)
        .is("deleted_at", null),
      supabase
        .from("pedidos_materiales")
        .select("id, estado, materiales(nombre)")
        .eq("obra_id", obra.id)
        .eq("estado", "faltante")
        .is("deleted_at", null),
      supabase
        .from("tareas")
        .select("id, nombre, estado")
        .eq("obra_id", obra.id)
        .eq("estado", "bloqueada")
        .is("deleted_at", null),
    ]);

  const alertas: Alerta[] = [];

  for (const v of vencimientos ?? []) {
    const enVentana = inicioVentana(v.fecha_vencimiento, v.alerta_dias_antes) <= hoy;
    if (v.fecha_vencimiento < hoy) {
      alertas.push({
        id: `venc-${v.id}`,
        nivel: "alert",
        titulo: `${v.tipo} vencido`,
        detalle: `${v.descripcion ?? "Sin descripción"} — venció ${formatFecha(v.fecha_vencimiento)}`,
      });
    } else if (enVentana) {
      alertas.push({
        id: `venc-${v.id}`,
        nivel: "warn",
        titulo: `${v.tipo} por vencer`,
        detalle: `${v.descripcion ?? "Sin descripción"} — vence ${formatFecha(v.fecha_vencimiento)}`,
      });
    }
  }

  for (const p of personal ?? []) {
    for (const [doc, fecha] of [
      ["ART", p.art_vencimiento],
      ["Seguro", p.seguro_vencimiento],
    ] as const) {
      if (!fecha) continue;
      if (fecha < hoy) {
        alertas.push({
          id: `${doc}-${p.id}`,
          nivel: "alert",
          titulo: `${doc} vencida de ${p.nombre}`,
          detalle: `Venció ${formatFecha(fecha)}`,
        });
      } else if (inicioVentana(fecha, DIAS_AVISO_DOCS) <= hoy) {
        alertas.push({
          id: `${doc}-${p.id}`,
          nivel: "warn",
          titulo: `${doc} de ${p.nombre} por vencer`,
          detalle: `Vence ${formatFecha(fecha)}`,
        });
      }
    }
  }

  for (const ped of pedidos ?? []) {
    alertas.push({
      id: `ped-${ped.id}`,
      nivel: "alert",
      titulo: `Material faltante: ${ped.materiales?.nombre ?? "sin nombre"}`,
      detalle: "Marcado FALTA desde campo — hay que pedirlo.",
    });
  }

  for (const t of tareas ?? []) {
    alertas.push({
      id: `tarea-${t.id}`,
      nivel: "warn",
      titulo: `Tarea bloqueada: ${t.nombre}`,
      detalle: "Revisá qué la traba en la pestaña Tareas.",
    });
  }

  // Rojas primero.
  alertas.sort((a, b) => (a.nivel === b.nivel ? 0 : a.nivel === "alert" ? -1 : 1));

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-ink">Alertas</h2>
      {alertas.length === 0 ? (
        <p className="rounded-xl border border-black/10 px-4 py-8 text-center text-muted">
          Todo en orden: no hay nada vencido ni faltante.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {alertas.map((a) => (
            <li
              key={a.id}
              className={`rounded-xl border px-4 py-3 ${
                a.nivel === "alert"
                  ? "border-alert/30 bg-alert/10"
                  : "border-warn/30 bg-warn/10"
              }`}
            >
              <p
                className={`font-semibold ${
                  a.nivel === "alert" ? "text-alert" : "text-warn"
                }`}
              >
                {a.titulo}
              </p>
              <p className="text-sm text-ink">{a.detalle}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
