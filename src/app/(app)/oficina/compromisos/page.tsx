import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import TablaOficina, {
  type ColumnaOficina,
} from "@/components/oficina/TablaOficina";
import CeldaEditable from "@/components/oficina/CeldaEditable";

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "pagado_parcial", label: "Pagado parcial" },
  { value: "pagado", label: "Pagado" },
];

const COLS: ColumnaOficina[] = [
  { key: "concepto", label: "Concepto" },
  { key: "gremio", label: "Gremio" },
  { key: "rubro_id", label: "Rubro" },
  { key: "monto_total", label: "Monto total", alinear: "right" },
  { key: "monto_pagado", label: "Pagado", alinear: "right" },
  { key: "estado", label: "Estado" },
  { key: "fecha_estimada_pago", label: "Pago estimado" },
  { key: "notas", label: "Notas" },
];

export default async function CompromisosPage() {
  const supabase = await createClient();
  const obra = await obraActiva(supabase);
  if (!obra) {
    return <p className="py-8 text-muted">No hay ninguna obra activa.</p>;
  }

  const [{ data: compromisos }, { data: rubros }] = await Promise.all([
    supabase
      .from("compromisos")
      .select("*, gremios(nombre)")
      .eq("obra_id", obra.id)
      .order("fecha_estimada_pago", { ascending: true, nullsFirst: false }),
    supabase
      .from("rubros")
      .select("id, nombre")
      .eq("obra_id", obra.id)
      .is("deleted_at", null)
      .order("nombre", { ascending: true }),
  ]);

  const filas = compromisos ?? [];
  const opcionesRubro = (rubros ?? []).map((r) => ({
    value: r.id,
    label: r.nombre,
  }));

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-ink">Compromisos</h2>
      <TablaOficina
        columnas={COLS}
        hayFilas={filas.length > 0}
        vacio="No hay compromisos cargados."
      >
        {filas.map((c) => (
          <tr
            key={c.id}
            className={c.deleted_at ? "opacity-40" : ""}
            title={c.deleted_at ? "Fila borrada (soft-delete)" : undefined}
          >
            <CeldaEditable
              tabla="compromisos"
              id={c.id}
              columna="concepto"
              valor={c.concepto}
            />
            <td className="px-3 py-1.5 align-middle">
              {c.gremios?.nombre ?? <span className="text-pending">—</span>}
            </td>
            <CeldaEditable
              tabla="compromisos"
              id={c.id}
              columna="rubro_id"
              valor={c.rubro_id}
              tipo="select"
              opciones={opcionesRubro}
            />
            <CeldaEditable
              tabla="compromisos"
              id={c.id}
              columna="monto_total"
              valor={c.monto_total}
              tipo="money"
            />
            <CeldaEditable
              tabla="compromisos"
              id={c.id}
              columna="monto_pagado"
              valor={c.monto_pagado}
              tipo="money"
            />
            <CeldaEditable
              tabla="compromisos"
              id={c.id}
              columna="estado"
              valor={c.estado}
              tipo="select"
              opciones={ESTADOS}
            />
            <CeldaEditable
              tabla="compromisos"
              id={c.id}
              columna="fecha_estimada_pago"
              valor={c.fecha_estimada_pago}
              tipo="date"
            />
            <CeldaEditable
              tabla="compromisos"
              id={c.id}
              columna="notas"
              valor={c.notas}
            />
          </tr>
        ))}
      </TablaOficina>
    </section>
  );
}
