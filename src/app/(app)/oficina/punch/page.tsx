import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import TablaOficina, {
  type ColumnaOficina,
} from "@/components/oficina/TablaOficina";
import { formatFechaCorta } from "@/lib/format";

// Punch list de cierre (solo lectura): defectos capturados en campo, con
// gremio responsable, foto y estado. Se resuelven desde el celular en obra.
const COLUMNAS: ColumnaOficina[] = [
  { key: "fecha", label: "Fecha" },
  { key: "etapa", label: "Etapa" },
  { key: "nombre", label: "Pendiente" },
  { key: "gremio", label: "Gremio" },
  { key: "foto", label: "Foto" },
  { key: "estado", label: "Estado" },
];

export default async function PunchOficinaPage() {
  const supabase = await createClient();
  const obra = await obraActiva(supabase);
  if (!obra) {
    return <p className="py-8 text-muted">No hay ninguna obra activa.</p>;
  }

  const [{ data: punch }, { data: fotos }] = await Promise.all([
    supabase
      .from("tareas")
      .select("*, etapas(nombre, orden), gremios(nombre)")
      .eq("obra_id", obra.id)
      .eq("tipo", "punch")
      .is("deleted_at", null)
      .order("created_at", { ascending: false }),
    supabase
      .from("fotos")
      .select("tarea_id, url")
      .eq("obra_id", obra.id)
      .eq("estado_upload", "subida")
      .not("tarea_id", "is", null)
      .is("deleted_at", null),
  ]);

  const filas = punch ?? [];
  const fotoPorTarea = new Map(
    (fotos ?? []).map((f) => [f.tarea_id, f.url] as const),
  );
  const abiertos = filas.filter((p) => p.estado !== "terminada").length;

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h2 className="text-lg font-semibold text-ink">Punch list</h2>
        <p className="text-sm text-muted">
          {abiertos} {abiertos === 1 ? "pendiente" : "pendientes"} de{" "}
          {filas.length}
        </p>
      </div>
      <TablaOficina
        columnas={COLUMNAS}
        hayFilas={filas.length > 0}
        vacio="No hay pendientes de cierre cargados."
      >
        {filas.map((p) => {
          const url = fotoPorTarea.get(p.id);
          const resuelto = p.estado === "terminada";
          return (
            <tr key={p.id}>
              <td className="px-3 py-1.5 align-middle whitespace-nowrap">
                {formatFechaCorta(p.created_at)}
              </td>
              <td className="px-3 py-1.5 align-middle">
                {p.etapas?.nombre ?? <span className="text-pending">—</span>}
              </td>
              <td className="px-3 py-1.5 align-middle font-medium text-ink">
                {p.nombre}
              </td>
              <td className="px-3 py-1.5 align-middle">
                {p.gremios?.nombre ?? <span className="text-pending">—</span>}
              </td>
              <td className="px-3 py-1.5 align-middle">
                {url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand underline"
                  >
                    Ver
                  </a>
                ) : (
                  <span className="text-pending">—</span>
                )}
              </td>
              <td className="px-3 py-1.5 align-middle">
                <span
                  className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                    resuelto
                      ? "border-ok/40 bg-ok/10 text-ok"
                      : "border-alert/40 bg-alert/10 text-alert"
                  }`}
                >
                  {resuelto ? "Resuelto" : "Pendiente"}
                </span>
              </td>
            </tr>
          );
        })}
      </TablaOficina>
    </section>
  );
}
