import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import { formatARS, fechaHoyISO } from "@/lib/format";
import LinkReporte from "@/components/oficina/LinkReporte";

// Dashboard de la obra activa: avance, plata por rubro, caja y asistencia.
// Barras CSS puras (sin librería de charts — principio de simplicidad).

function Tarjeta({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-black/10 p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Barra({
  porcentaje,
  color,
}: {
  porcentaje: number;
  color: "brand" | "ok" | "alert";
}) {
  const clase =
    color === "ok" ? "bg-ok" : color === "alert" ? "bg-alert" : "bg-brand";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-black/5">
      <div
        className={`h-full rounded-full ${clase}`}
        style={{ width: `${Math.min(100, Math.max(0, porcentaje))}%` }}
      />
    </div>
  );
}

export default async function ResumenPage() {
  const supabase = await createClient();
  const obra = await obraActiva(supabase);
  if (!obra) {
    return <p className="py-8 text-muted">No hay ninguna obra activa.</p>;
  }

  const hoy = fechaHoyISO();
  const hace7 = new Date(hoy + "T00:00:00");
  hace7.setDate(hace7.getDate() - 6);
  const desde = hace7.toISOString().slice(0, 10);

  const [
    { data: tareas },
    { data: rubros },
    { data: gastos },
    { data: ingresos },
    { data: asistencias },
    { data: personal },
    { data: compromisos },
    { data: obraToken },
  ] = await Promise.all([
    supabase
      .from("tareas")
      .select("estado, porcentaje_avance")
      .eq("obra_id", obra.id)
      .eq("tipo", "obra") // las punch no cuentan para el avance
      .is("deleted_at", null),
    supabase
      .from("rubros")
      .select("id, nombre, presupuesto_base")
      .eq("obra_id", obra.id)
      .is("deleted_at", null)
      .order("presupuesto_base", { ascending: false }),
    supabase
      .from("gastos")
      .select("rubro_id, monto")
      .eq("obra_id", obra.id)
      .is("deleted_at", null),
    supabase
      .from("ingresos")
      .select("monto")
      .eq("obra_id", obra.id)
      .is("deleted_at", null),
    supabase
      .from("asistencias")
      .select("fecha, medio_dia")
      .eq("obra_id", obra.id)
      .gte("fecha", desde)
      .is("deleted_at", null),
    supabase
      .from("personal")
      .select("id")
      .eq("obra_id", obra.id)
      .is("deleted_at", null),
    supabase
      .from("compromisos")
      .select("monto_total, monto_pagado")
      .eq("obra_id", obra.id)
      .neq("estado", "pagado")
      .is("deleted_at", null),
    supabase
      .from("obras")
      .select("token_reporte")
      .eq("id", obra.id)
      .maybeSingle(),
  ]);

  // Avance: promedio simple del porcentaje de las tareas vivas.
  const vivas = tareas ?? [];
  const avance =
    vivas.length > 0
      ? Math.round(
          vivas.reduce((acc, t) => acc + t.porcentaje_avance, 0) / vivas.length,
        )
      : 0;
  const terminadas = vivas.filter((t) => t.estado === "terminada").length;

  // Plata por rubro.
  const gastadoPorRubro = new Map<string, number>();
  let totalGastado = 0;
  for (const g of gastos ?? []) {
    gastadoPorRubro.set(
      g.rubro_id,
      (gastadoPorRubro.get(g.rubro_id) ?? 0) + g.monto,
    );
    totalGastado += g.monto;
  }
  const totalIngresos = (ingresos ?? []).reduce((acc, i) => acc + i.monto, 0);
  const totalPresupuesto = (rubros ?? []).reduce(
    (acc, r) => acc + r.presupuesto_base,
    0,
  );
  const saldoCaja = totalIngresos - totalGastado;

  // Comprometido = saldo impago de compromisos vivos (los pagos ya son gastos:
  // se excluye estado='pagado' y se resta monto_pagado para no contar doble).
  const totalComprometido = (compromisos ?? []).reduce(
    (acc, c) => acc + Math.max(0, c.monto_total - c.monto_pagado),
    0,
  );
  const totalProyectado = totalGastado + totalComprometido;

  // Asistencia últimos 7 días: jornales equivalentes por fecha.
  const jornalesPorFecha = new Map<string, number>();
  for (const a of asistencias ?? []) {
    jornalesPorFecha.set(
      a.fecha,
      (jornalesPorFecha.get(a.fecha) ?? 0) + (a.medio_dia ? 0.5 : 1),
    );
  }
  const dias: { fecha: string; jornales: number }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(hoy + "T00:00:00");
    d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    dias.push({ fecha: iso, jornales: jornalesPorFecha.get(iso) ?? 0 });
  }
  const plantel = (personal ?? []).length;

  return (
    <div className="flex flex-col gap-4">
      {obraToken?.token_reporte && (
        <LinkReporte token={obraToken.token_reporte} />
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <Tarjeta titulo="Avance de obra">
          <p className="mb-2 text-3xl font-bold tabular-nums text-ink">
            {avance}%
          </p>
          <Barra porcentaje={avance} color="brand" />
          <p className="mt-2 text-sm text-muted">
            {terminadas} de {vivas.length} tareas terminadas
          </p>
        </Tarjeta>

        <Tarjeta titulo="Caja (ingresos − gastos)">
          <p
            className={`mb-2 text-3xl font-bold tabular-nums ${
              saldoCaja < 0 ? "text-alert" : "text-ink"
            }`}
          >
            {formatARS(saldoCaja)}
          </p>
          <p className="text-sm text-muted">
            Ingresos {formatARS(totalIngresos)} · Gastos{" "}
            {formatARS(totalGastado)}
          </p>
        </Tarjeta>

        <Tarjeta titulo="Presupuesto">
          <p className="mb-2 text-3xl font-bold tabular-nums text-ink">
            {formatARS(totalGastado)}
          </p>
          <Barra
            porcentaje={
              totalPresupuesto > 0 ? (totalGastado / totalPresupuesto) * 100 : 0
            }
            color={totalProyectado > totalPresupuesto ? "alert" : "ok"}
          />
          <p className="mt-2 text-sm text-muted">
            de {formatARS(totalPresupuesto)} presupuestados
          </p>
          {totalComprometido > 0 && (
            <p
              className={`mt-1 text-sm ${
                totalProyectado > totalPresupuesto ? "text-alert" : "text-muted"
              }`}
            >
              + {formatARS(totalComprometido)} comprometidos → proyectado{" "}
              {formatARS(totalProyectado)}
            </p>
          )}
        </Tarjeta>
      </div>

      <Tarjeta titulo="Plata por rubro">
        {(rubros ?? []).length === 0 ? (
          <p className="text-sm text-muted">No hay rubros cargados.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {(rubros ?? []).map((r) => {
              const gastado = gastadoPorRubro.get(r.id) ?? 0;
              const pasado = r.presupuesto_base > 0 && gastado > r.presupuesto_base;
              return (
                <li key={r.id}>
                  <div className="mb-1 flex items-baseline justify-between text-sm">
                    <span className="font-medium text-ink">{r.nombre}</span>
                    <span
                      className={`tabular-nums ${pasado ? "text-alert" : "text-muted"}`}
                    >
                      {formatARS(gastado)} / {formatARS(r.presupuesto_base)}
                    </span>
                  </div>
                  <Barra
                    porcentaje={
                      r.presupuesto_base > 0
                        ? (gastado / r.presupuesto_base) * 100
                        : gastado > 0
                          ? 100
                          : 0
                    }
                    color={pasado ? "alert" : "brand"}
                  />
                </li>
              );
            })}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta titulo={`Asistencia últimos 7 días (plantel: ${plantel})`}>
        <div className="flex items-end gap-2">
          {dias.map((d) => {
            const alto =
              plantel > 0 ? Math.min(100, (d.jornales / plantel) * 100) : 0;
            const dia = new Date(d.fecha + "T00:00:00");
            return (
              <div key={d.fecha} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs tabular-nums text-muted">
                  {d.jornales || ""}
                </span>
                <div className="flex h-24 w-full items-end rounded bg-black/5">
                  <div
                    className="w-full rounded bg-brand"
                    style={{ height: `${alto}%` }}
                  />
                </div>
                <span className="text-xs text-muted">
                  {dia.getDate()}/{dia.getMonth() + 1}
                </span>
              </div>
            );
          })}
        </div>
      </Tarjeta>
    </div>
  );
}
