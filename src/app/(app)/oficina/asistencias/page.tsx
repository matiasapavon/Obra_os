import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import TablaOficina, {
  type ColumnaOficina,
} from "@/components/oficina/TablaOficina";
import CeldaEditable from "@/components/oficina/CeldaEditable";
import { formatFechaCorta } from "@/lib/format";

const COLUMNAS: ColumnaOficina[] = [
  { key: "personal", label: "Personal" },
  { key: "fecha", label: "Fecha" },
  { key: "hora_entrada", label: "Entrada" },
  { key: "hora_salida", label: "Salida" },
  { key: "medio_dia", label: "Medio día" },
  { key: "observacion", label: "Observación" },
  { key: "origen", label: "Origen" },
];

export default async function AsistenciasPage() {
  const supabase = await createClient();
  const obra = await obraActiva(supabase);
  if (!obra) {
    return <p className="py-8 text-muted">No hay ninguna obra activa.</p>;
  }

  const { data: asistencias } = await supabase
    .from("asistencias")
    .select("*, personal(nombre)")
    .eq("obra_id", obra.id)
    .order("fecha", { ascending: false })
    .order("captured_at", { ascending: false });

  const filas = asistencias ?? [];

  return (
    <TablaOficina
      columnas={COLUMNAS}
      hayFilas={filas.length > 0}
      vacio="No hay asistencias registradas."
    >
      {filas.map((a) => (
        <tr
          key={a.id}
          className={a.deleted_at ? "opacity-40" : ""}
          title={a.deleted_at ? "Fila borrada (soft-delete)" : undefined}
        >
          <td className="px-3 py-1.5 align-middle font-medium text-ink">
            {a.personal?.nombre ?? <span className="text-pending">—</span>}
          </td>
          <td className="px-3 py-1.5 align-middle">{formatFechaCorta(a.fecha)}</td>
          <CeldaEditable
            tabla="asistencias"
            id={a.id}
            columna="hora_entrada"
            valor={a.hora_entrada}
          />
          <CeldaEditable
            tabla="asistencias"
            id={a.id}
            columna="hora_salida"
            valor={a.hora_salida}
          />
          <td className="px-3 py-1.5 align-middle">
            {a.medio_dia ? (
              <span className="inline-block rounded-full border border-warn/40 bg-warn/10 px-2.5 py-0.5 text-xs font-bold text-warn">
                Medio día
              </span>
            ) : (
              <span className="text-pending">—</span>
            )}
          </td>
          <CeldaEditable
            tabla="asistencias"
            id={a.id}
            columna="observacion"
            valor={a.observacion}
          />
          <td className="px-3 py-1.5 align-middle">
            {a.created_offline ? (
              <span className="inline-block rounded-full border border-pending/40 bg-pending/10 px-2.5 py-0.5 text-xs font-bold text-muted">
                campo
              </span>
            ) : (
              <span className="text-pending">—</span>
            )}
          </td>
        </tr>
      ))}
    </TablaOficina>
  );
}
