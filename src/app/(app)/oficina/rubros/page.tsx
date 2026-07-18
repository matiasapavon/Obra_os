import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import { formatARS } from "@/lib/format";
import TablaOficina, {
  type ColumnaOficina,
} from "@/components/oficina/TablaOficina";
import CeldaEditable from "@/components/oficina/CeldaEditable";
import FormAlta from "@/components/oficina/FormAlta";

const COLS: ColumnaOficina[] = [
  { key: "nombre", label: "Rubro" },
  { key: "presupuesto_base", label: "Presupuesto", alinear: "right" },
  { key: "gastado", label: "Gastado", alinear: "right" },
  { key: "saldo", label: "Saldo", alinear: "right" },
  { key: "notas", label: "Notas" },
];

export default async function RubrosPage() {
  const supabase = await createClient();
  const obra = await obraActiva(supabase);
  if (!obra) {
    return <p className="py-8 text-muted">No hay ninguna obra activa.</p>;
  }

  const [{ data: rubros }, { data: gastos }] = await Promise.all([
    supabase
      .from("rubros")
      .select("*")
      .eq("obra_id", obra.id)
      .order("nombre", { ascending: true }),
    supabase
      .from("gastos")
      .select("rubro_id, monto")
      .eq("obra_id", obra.id)
      .is("deleted_at", null),
  ]);

  const gastadoPorRubro = new Map<string, number>();
  for (const g of gastos ?? []) {
    gastadoPorRubro.set(
      g.rubro_id,
      (gastadoPorRubro.get(g.rubro_id) ?? 0) + g.monto,
    );
  }

  const filas = rubros ?? [];

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-ink">Rubros</h2>
      <FormAlta
        tabla="rubros"
        etiqueta="Rubro"
        campos={[
          { key: "nombre", label: "Nombre", requerido: true },
          { key: "presupuesto_base", label: "Presupuesto", tipo: "money" },
        ]}
      />
      <TablaOficina
        columnas={COLS}
        hayFilas={filas.length > 0}
        vacio="No hay rubros cargados."
      >
        {filas.map((r) => {
          const gastado = gastadoPorRubro.get(r.id) ?? 0;
          const saldo = r.presupuesto_base - gastado;
          return (
            <tr
              key={r.id}
              className={r.deleted_at ? "opacity-40" : ""}
              title={r.deleted_at ? "Fila borrada (soft-delete)" : undefined}
            >
              {r.es_sistema ? (
                // "Sin clasificar" es de sistema: el nombre no se toca.
                <td className="px-3 py-1.5 align-middle font-medium text-ink">
                  {r.nombre}
                </td>
              ) : (
                <CeldaEditable
                  tabla="rubros"
                  id={r.id}
                  columna="nombre"
                  valor={r.nombre}
                />
              )}
              <CeldaEditable
                tabla="rubros"
                id={r.id}
                columna="presupuesto_base"
                valor={r.presupuesto_base}
                tipo="money"
              />
              <td className="px-3 py-1.5 text-right align-middle tabular-nums">
                {formatARS(gastado)}
              </td>
              <td
                className={`px-3 py-1.5 text-right align-middle tabular-nums ${
                  saldo < 0 ? "text-alert" : ""
                }`}
              >
                {formatARS(saldo)}
              </td>
              <CeldaEditable
                tabla="rubros"
                id={r.id}
                columna="notas"
                valor={r.notas}
              />
            </tr>
          );
        })}
      </TablaOficina>
    </section>
  );
}
