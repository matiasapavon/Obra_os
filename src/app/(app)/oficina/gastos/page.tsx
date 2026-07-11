import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import { formatARS } from "@/lib/format";
import TablaOficina, {
  type ColumnaOficina,
} from "@/components/oficina/TablaOficina";
import CeldaEditable from "@/components/oficina/CeldaEditable";

const TIPOS = [
  { value: "material", label: "Material" },
  { value: "mano_de_obra", label: "Mano de obra" },
  { value: "certificado", label: "Certificado" },
  { value: "honorario", label: "Honorario" },
  { value: "adicional", label: "Adicional" },
  { value: "varios", label: "Varios" },
];

const MEDIOS_PAGO = [
  { value: "efectivo", label: "Efectivo" },
  { value: "transferencia", label: "Transferencia" },
  { value: "cheque", label: "Cheque" },
  { value: "otro", label: "Otro" },
];

const MONEDAS = [
  { value: "ARS", label: "ARS" },
  { value: "USD", label: "USD" },
];

const COLS: ColumnaOficina[] = [
  { key: "fecha", label: "Fecha" },
  { key: "concepto", label: "Concepto" },
  { key: "rubro_id", label: "Rubro" },
  { key: "monto", label: "Monto", alinear: "right" },
  { key: "moneda", label: "Moneda" },
  { key: "tipo", label: "Tipo" },
  { key: "medio_pago", label: "Medio de pago" },
  { key: "gremio", label: "Gremio" },
  { key: "comprobante_url", label: "Comprobante" },
  { key: "notas", label: "Notas" },
];

export default async function GastosPage() {
  const supabase = await createClient();
  const obra = await obraActiva(supabase);
  if (!obra) {
    return <p className="py-8 text-muted">No hay ninguna obra activa.</p>;
  }

  const [{ data: gastos }, { data: rubros }] = await Promise.all([
    supabase
      .from("gastos")
      .select("*, gremios(nombre)")
      .eq("obra_id", obra.id)
      .order("fecha", { ascending: false }),
    supabase
      .from("rubros")
      .select("id, nombre")
      .eq("obra_id", obra.id)
      .is("deleted_at", null)
      .order("nombre", { ascending: true }),
  ]);

  const filas = gastos ?? [];
  const opcionesRubro = (rubros ?? []).map((r) => ({
    value: r.id,
    label: r.nombre,
  }));
  const totalVisible = filas
    .filter((g) => !g.deleted_at)
    .reduce((acc, g) => acc + g.monto, 0);

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-ink">Gastos</h2>
        <p className="text-sm text-muted">
          Total: <span className="tabular-nums">{formatARS(totalVisible)}</span>
        </p>
      </div>
      <TablaOficina
        columnas={COLS}
        hayFilas={filas.length > 0}
        vacio="No hay gastos cargados."
      >
        {filas.map((g) => (
          <tr
            key={g.id}
            className={g.deleted_at ? "opacity-40" : ""}
            title={g.deleted_at ? "Fila borrada (soft-delete)" : undefined}
          >
            <CeldaEditable
              tabla="gastos"
              id={g.id}
              columna="fecha"
              valor={g.fecha}
              tipo="date"
            />
            <CeldaEditable
              tabla="gastos"
              id={g.id}
              columna="concepto"
              valor={g.concepto}
            />
            <CeldaEditable
              tabla="gastos"
              id={g.id}
              columna="rubro_id"
              valor={g.rubro_id}
              tipo="select"
              opciones={opcionesRubro}
            />
            <CeldaEditable
              tabla="gastos"
              id={g.id}
              columna="monto"
              valor={g.monto}
              tipo="money"
            />
            <CeldaEditable
              tabla="gastos"
              id={g.id}
              columna="moneda"
              valor={g.moneda}
              tipo="select"
              opciones={MONEDAS}
            />
            <CeldaEditable
              tabla="gastos"
              id={g.id}
              columna="tipo"
              valor={g.tipo}
              tipo="select"
              opciones={TIPOS}
            />
            <CeldaEditable
              tabla="gastos"
              id={g.id}
              columna="medio_pago"
              valor={g.medio_pago}
              tipo="select"
              opciones={MEDIOS_PAGO}
            />
            <td className="px-3 py-1.5 align-middle">
              {g.gremios?.nombre ?? <span className="text-pending">—</span>}
            </td>
            <CeldaEditable
              tabla="gastos"
              id={g.id}
              columna="comprobante_url"
              valor={g.comprobante_url}
            />
            <CeldaEditable
              tabla="gastos"
              id={g.id}
              columna="notas"
              valor={g.notas}
            />
          </tr>
        ))}
      </TablaOficina>
    </section>
  );
}
