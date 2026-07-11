import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import { fechaHoyISO } from "@/lib/format";
import TablaOficina, {
  type ColumnaOficina,
} from "@/components/oficina/TablaOficina";
import CeldaEditable from "@/components/oficina/CeldaEditable";

const TIPOS = [
  { value: "ART", label: "ART" },
  { value: "seguro", label: "Seguro" },
  { value: "permiso", label: "Permiso" },
  { value: "inspeccion", label: "Inspección" },
  { value: "otro", label: "Otro" },
];

const ESTADOS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "resuelto", label: "Resuelto" },
];

const COLS: ColumnaOficina[] = [
  { key: "fecha_vencimiento", label: "Vence" },
  { key: "tipo", label: "Tipo" },
  { key: "descripcion", label: "Descripción" },
  { key: "responsable", label: "Responsable" },
  { key: "alerta_dias_antes", label: "Alerta (días antes)", alinear: "right" },
  { key: "estado", label: "Estado" },
];

export default async function VencimientosPage() {
  const supabase = await createClient();
  const obra = await obraActiva(supabase);
  if (!obra) {
    return <p className="py-8 text-muted">No hay ninguna obra activa.</p>;
  }

  const { data: vencimientos } = await supabase
    .from("vencimientos_admin")
    .select("*")
    .eq("obra_id", obra.id)
    .order("fecha_vencimiento", { ascending: true });

  const filas = vencimientos ?? [];
  const hoy = fechaHoyISO();

  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-ink">
        Vencimientos administrativos
      </h2>
      <TablaOficina
        columnas={COLS}
        hayFilas={filas.length > 0}
        vacio="No hay vencimientos cargados."
      >
        {filas.map((v) => {
          const pendiente = v.estado === "pendiente" && !v.deleted_at;
          const vencido = pendiente && v.fecha_vencimiento < hoy;
          return (
            <tr
              key={v.id}
              className={v.deleted_at ? "opacity-40" : ""}
              title={v.deleted_at ? "Fila borrada (soft-delete)" : undefined}
            >
              <CeldaEditable
                tabla="vencimientos_admin"
                id={v.id}
                columna="fecha_vencimiento"
                valor={v.fecha_vencimiento}
                tipo="date"
                tono={vencido ? "alert" : undefined}
              />
              <CeldaEditable
                tabla="vencimientos_admin"
                id={v.id}
                columna="tipo"
                valor={v.tipo}
                tipo="select"
                opciones={TIPOS}
              />
              <CeldaEditable
                tabla="vencimientos_admin"
                id={v.id}
                columna="descripcion"
                valor={v.descripcion}
              />
              <CeldaEditable
                tabla="vencimientos_admin"
                id={v.id}
                columna="responsable"
                valor={v.responsable}
              />
              <CeldaEditable
                tabla="vencimientos_admin"
                id={v.id}
                columna="alerta_dias_antes"
                valor={v.alerta_dias_antes}
                tipo="number"
              />
              <CeldaEditable
                tabla="vencimientos_admin"
                id={v.id}
                columna="estado"
                valor={v.estado}
                tipo="select"
                opciones={ESTADOS}
              />
            </tr>
          );
        })}
      </TablaOficina>
    </section>
  );
}
