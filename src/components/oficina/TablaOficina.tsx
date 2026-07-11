import type { ReactNode } from "react";

// Shell de tabla reutilizable de la oficina: scroll horizontal, thead sticky,
// zebra en las filas, padding consistente, es-AR. Desktop = gestionar: filas
// densas pero con targets ≥32px. Las tablas de entidad componen las filas.
export type ColumnaOficina = { key: string; label: string; alinear?: "right" };

export default function TablaOficina({
  columnas,
  children,
  vacio = "No hay datos para mostrar.",
  hayFilas = true,
}: {
  columnas: ColumnaOficina[];
  children: ReactNode;
  vacio?: string;
  hayFilas?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-black/10">
      <table className="w-full border-collapse text-sm">
        <thead className="sticky top-0 z-10 bg-paper">
          <tr className="border-b border-black/10 text-left">
            {columnas.map((col) => (
              <th
                key={col.key}
                className={`px-3 py-2 font-semibold text-muted ${
                  col.alinear === "right" ? "text-right" : ""
                }`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr:nth-child(even)]:bg-black/[0.02]">
          {hayFilas ? (
            children
          ) : (
            <tr>
              <td
                colSpan={columnas.length}
                className="px-3 py-8 text-center text-muted"
              >
                {vacio}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
