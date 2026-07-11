import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import TablaOficina, {
  type ColumnaOficina,
} from "@/components/oficina/TablaOficina";
import CeldaEditable from "@/components/oficina/CeldaEditable";

const ESTADOS = [
  { value: "propuesto", label: "Propuesto" },
  { value: "aprobado", label: "Aprobado" },
  { value: "ejecutado", label: "Ejecutado" },
  { value: "facturado", label: "Facturado" },
  { value: "cobrado", label: "Cobrado" },
];

const ORIGENES = [
  { value: "cliente", label: "Cliente" },
  { value: "proyecto", label: "Proyecto" },
  { value: "imprevisto", label: "Imprevisto" },
];

const LO_PAGA = [
  { value: "cliente", label: "Cliente" },
  { value: "estudio", label: "Estudio" },
  { value: "compartido", label: "Compartido" },
];

const COLS: ColumnaOficina[] = [
  { key: "fecha", label: "Fecha" },
  { key: "descripcion", label: "Descripción" },
  { key: "estado", label: "Estado" },
  { key: "origen", label: "Origen" },
  { key: "lo_paga", label: "Lo paga" },
  { key: "costo_estimado", label: "Costo est.", alinear: "right" },
  { key: "costo_real", label: "Costo real", alinear: "right" },
  { key: "notas", label: "Notas" },
];

export default async function AdicionalesPage() {
  const supabase = await createClient();
  const obra = await obraActiva(supabase);
  if (!obra) {
    return <p className="py-8 text-muted">No hay ninguna obra activa.</p>;
  }

  const { data: adicionales } = await supabase
    .from("adicionales")
    .select("*")
    .eq("obra_id", obra.id)
    .order("fecha", { ascending: false });

  const filas = adicionales ?? [];

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-ink">Adicionales</h2>
      <TablaOficina
        columnas={COLS}
        hayFilas={filas.length > 0}
        vacio="No hay adicionales cargados."
      >
        {filas.map((a) => (
          <tr
            key={a.id}
            className={a.deleted_at ? "opacity-40" : ""}
            title={a.deleted_at ? "Fila borrada (soft-delete)" : undefined}
          >
            <CeldaEditable
              tabla="adicionales"
              id={a.id}
              columna="fecha"
              valor={a.fecha}
              tipo="date"
            />
            <CeldaEditable
              tabla="adicionales"
              id={a.id}
              columna="descripcion"
              valor={a.descripcion}
            />
            <CeldaEditable
              tabla="adicionales"
              id={a.id}
              columna="estado"
              valor={a.estado}
              tipo="select"
              opciones={ESTADOS}
            />
            <CeldaEditable
              tabla="adicionales"
              id={a.id}
              columna="origen"
              valor={a.origen}
              tipo="select"
              opciones={ORIGENES}
            />
            <CeldaEditable
              tabla="adicionales"
              id={a.id}
              columna="lo_paga"
              valor={a.lo_paga}
              tipo="select"
              opciones={LO_PAGA}
            />
            <CeldaEditable
              tabla="adicionales"
              id={a.id}
              columna="costo_estimado"
              valor={a.costo_estimado}
              tipo="money"
            />
            <CeldaEditable
              tabla="adicionales"
              id={a.id}
              columna="costo_real"
              valor={a.costo_real}
              tipo="money"
            />
            <CeldaEditable
              tabla="adicionales"
              id={a.id}
              columna="notas"
              valor={a.notas}
            />
          </tr>
        ))}
      </TablaOficina>
    </section>
  );
}
