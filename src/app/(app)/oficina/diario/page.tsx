import { createClient } from "@/lib/supabase/server";
import { obraActiva } from "@/lib/oficina/obra";
import TablaOficina, {
  type ColumnaOficina,
} from "@/components/oficina/TablaOficina";
import { formatFechaCorta } from "@/lib/format";
import BotonAdicionalDesdeNota from "@/components/oficina/BotonAdicionalDesdeNota";

const COLUMNAS: ColumnaOficina[] = [
  { key: "fecha", label: "Fecha" },
  { key: "texto", label: "Nota" },
  { key: "clima", label: "Clima" },
  { key: "etiquetas", label: "Etiquetas" },
  { key: "fotos", label: "Fotos", alinear: "right" },
  { key: "origen", label: "Origen" },
  { key: "accion", label: "Acción" },
];

export default async function DiarioPage() {
  const supabase = await createClient();
  const obra = await obraActiva(supabase);
  if (!obra) {
    return <p className="py-8 text-muted">No hay ninguna obra activa.</p>;
  }

  const [{ data: diario }, { data: adicionales }] = await Promise.all([
    supabase
      .from("diario_obra")
      .select("*, fotos(count)")
      .eq("obra_id", obra.id)
      .order("fecha", { ascending: false }),
    // Notas que ya tienen adicional creado (change event procesado).
    supabase
      .from("adicionales")
      .select("diario_id")
      .eq("obra_id", obra.id)
      .not("diario_id", "is", null),
  ]);

  const filas = diario ?? [];
  const notasConAdicional = new Set(
    (adicionales ?? []).map((a) => a.diario_id).filter(Boolean),
  );

  return (
    <TablaOficina
      columnas={COLUMNAS}
      hayFilas={filas.length > 0}
      vacio="No hay entradas en el diario."
    >
      {filas.map((d) => {
        const cuentaFotos = d.fotos?.[0]?.count ?? 0;
        return (
          <tr
            key={d.id}
            className={d.deleted_at ? "opacity-40" : ""}
            title={d.deleted_at ? "Fila borrada (soft-delete)" : undefined}
          >
            <td className="px-3 py-1.5 align-middle whitespace-nowrap font-medium text-ink">
              {formatFechaCorta(d.fecha)}
            </td>
            <td className="px-3 py-1.5 align-middle max-w-md">
              {d.texto ?? <span className="text-pending">—</span>}
            </td>
            <td className="px-3 py-1.5 align-middle">
              {d.clima ?? <span className="text-pending">—</span>}
            </td>
            <td className="px-3 py-1.5 align-middle">
              {d.etiquetas.length > 0 ? (
                <span className="flex flex-wrap gap-1">
                  {d.etiquetas.map((etq) => (
                    <span
                      key={etq}
                      className="inline-block rounded-full border border-brand/30 bg-brand/10 px-2 py-0.5 text-xs font-semibold text-brand"
                    >
                      {etq}
                    </span>
                  ))}
                </span>
              ) : (
                <span className="text-pending">—</span>
              )}
            </td>
            <td className="px-3 py-1.5 align-middle text-right tabular-nums">
              {cuentaFotos > 0 ? cuentaFotos : <span className="text-pending">—</span>}
            </td>
            <td className="px-3 py-1.5 align-middle">
              {d.created_offline ? (
                <span className="inline-block rounded-full border border-pending/40 bg-pending/10 px-2.5 py-0.5 text-xs font-bold text-muted">
                  campo
                </span>
              ) : (
                <span className="text-pending">—</span>
              )}
            </td>
            <td className="px-3 py-1.5 align-middle">
              {d.etiquetas.includes("extra") ? (
                <BotonAdicionalDesdeNota
                  diarioId={d.id}
                  tieneAdicional={notasConAdicional.has(d.id)}
                />
              ) : (
                <span className="text-pending">—</span>
              )}
            </td>
          </tr>
        );
      })}
    </TablaOficina>
  );
}
