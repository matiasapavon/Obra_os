import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import { formatARS } from "@/lib/format";
import TablaOficina, {
  type ColumnaOficina,
} from "@/components/oficina/TablaOficina";
import CeldaEditable from "@/components/oficina/CeldaEditable";

const MONEDAS = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" },
];

const CONCEPTOS = [
  { value: "anticipo", label: "Anticipo" },
  { value: "certificado", label: "Certificado" },
  { value: "adicional", label: "Adicional" },
  { value: "final", label: "Final" },
];

const COLS: ColumnaOficina[] = [
  { key: "fecha", label: "Fecha" },
  { key: "concepto", label: "Concepto" },
  { key: "monto", label: "Monto", alinear: "right" },
  { key: "moneda", label: "Moneda" },
  { key: "notas", label: "Notas" },
];

export default async function IngresosPage() {
  const supabase = await createClient();
  const obra = await obraActiva(supabase);
  if (!obra) {
    return <p className="py-8 text-muted">No hay ninguna obra activa.</p>;
  }

  const { data: ingresos } = await supabase
    .from("ingresos")
    .select("*")
    .eq("obra_id", obra.id)
    .order("fecha", { ascending: false });

  const filas = ingresos ?? [];
  const totalVisible = filas
    .filter((i) => !i.deleted_at)
    .reduce((acc, i) => acc + i.monto, 0);

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-ink">Ingresos</h2>
        <p className="text-sm text-muted">
          Total: <span className="tabular-nums">{formatARS(totalVisible)}</span>
        </p>
      </div>
      <TablaOficina
        columnas={COLS}
        hayFilas={filas.length > 0}
        vacio="No hay ingresos cargados."
      >
        {filas.map((i) => (
          <tr
            key={i.id}
            className={i.deleted_at ? "opacity-40" : ""}
            title={i.deleted_at ? "Fila borrada (soft-delete)" : undefined}
          >
            <CeldaEditable
              tabla="ingresos"
              id={i.id}
              columna="fecha"
              valor={i.fecha}
              tipo="date"
            />
            <CeldaEditable
              tabla="ingresos"
              id={i.id}
              columna="concepto"
              valor={i.concepto}
              tipo="select"
              opciones={CONCEPTOS}
            />
            <CeldaEditable
              tabla="ingresos"
              id={i.id}
              columna="monto"
              valor={i.monto}
              tipo="money"
            />
            <CeldaEditable
              tabla="ingresos"
              id={i.id}
              columna="moneda"
              valor={i.moneda}
              tipo="select"
              opciones={MONEDAS}
            />
            <CeldaEditable
              tabla="ingresos"
              id={i.id}
              columna="notas"
              valor={i.notas}
            />
          </tr>
        ))}
      </TablaOficina>
    </section>
  );
}
