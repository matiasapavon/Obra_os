import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import { formatARS } from "@/lib/format";
import TablaOficina, {
  type ColumnaOficina,
} from "@/components/oficina/TablaOficina";
import CeldaEditable from "@/components/oficina/CeldaEditable";
import FormAlta from "@/components/oficina/FormAlta";
import BotonGastoDesdeTicket from "@/components/oficina/BotonGastoDesdeTicket";

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

  const [{ data: gastos }, { data: rubros }, { data: tickets }] =
    await Promise.all([
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
      // Tickets de campo sin gasto: pendientes de imputar (subidos) y en
      // tránsito (todavía sincronizando desde el celular).
      supabase
        .from("fotos")
        .select("id, url, fecha, estado_upload")
        .eq("obra_id", obra.id)
        .eq("tipo", "ticket")
        .is("gasto_id", null)
        .is("deleted_at", null)
        .order("fecha", { ascending: false }),
    ]);

  const filas = gastos ?? [];
  const opcionesRubro = (rubros ?? []).map((r) => ({
    value: r.id,
    label: r.nombre,
  }));
  const totalVisible = filas
    .filter((g) => !g.deleted_at)
    .reduce((acc, g) => acc + g.monto, 0);

  const ticketsSubidos = (tickets ?? []).filter(
    (t) => t.estado_upload === "subida" && t.url,
  );
  const ticketsEnTransito = (tickets ?? []).length - ticketsSubidos.length;

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-ink">Gastos</h2>
        <p className="text-sm text-muted">
          Total: <span className="tabular-nums">{formatARS(totalVisible)}</span>
        </p>
      </div>
      {(ticketsSubidos.length > 0 || ticketsEnTransito > 0) && (
        <div className="mb-3 rounded-xl border border-warn/40 bg-warn/5 p-3">
          <p className="mb-2 text-sm font-semibold text-ink">
            Tickets de campo pendientes
            {ticketsEnTransito > 0 && (
              <span className="ml-2 font-normal text-muted">
                ({ticketsEnTransito} en tránsito desde el celular)
              </span>
            )}
          </p>
          {ticketsSubidos.length > 0 && (
            <ul className="flex flex-wrap gap-3">
              {ticketsSubidos.map((t) => (
                <li key={t.id} className="flex flex-col items-center gap-1">
                  <a href={t.url!} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={t.url!}
                      alt="Ticket de campo"
                      className="h-24 w-24 rounded-lg border border-black/10 object-cover"
                    />
                  </a>
                  <span className="text-xs text-muted">{t.fecha}</span>
                  <BotonGastoDesdeTicket fotoId={t.id} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <FormAlta
        tabla="gastos"
        etiqueta="Gasto"
        campos={[
          { key: "concepto", label: "Concepto", requerido: true },
          { key: "monto", label: "Monto", tipo: "money", requerido: true },
          { key: "rubro_id", label: "Rubro", tipo: "select", opciones: opcionesRubro },
          { key: "fecha", label: "Fecha", tipo: "date" },
          { key: "tipo", label: "Tipo", tipo: "select", opciones: TIPOS },
          { key: "medio_pago", label: "Medio de pago", tipo: "select", opciones: MEDIOS_PAGO },
          { key: "moneda", label: "Moneda", tipo: "select", opciones: MONEDAS },
        ]}
      />
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
