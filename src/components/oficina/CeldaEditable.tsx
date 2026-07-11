"use client";

import { useState, useTransition } from "react";
import { actualizarCampo } from "@/lib/oficina/actualizarCampo";
import { formatARS, formatFechaCorta } from "@/lib/format";

type Tipo = "text" | "number" | "money" | "date" | "select";
type Valor = string | number | boolean | null;

// Celda de tabla editable inline. Click → input/select; blur o change confirma
// vía el server action. Estado pending sutil; en error revierte y muestra pista.
export default function CeldaEditable({
  tabla,
  id,
  columna,
  valor,
  tipo = "text",
  opciones,
  tono,
}: {
  tabla: string;
  id: string;
  columna: string;
  valor: Valor;
  tipo?: Tipo;
  opciones?: { value: string; label: string }[];
  tono?: "warn" | "alert";
}) {
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  // Override optimista sobre el valor del server. Cuando el prop cambia (por el
  // revalidatePath del action) se descarta el override ajustando estado durante
  // el render — patrón recomendado, sin useEffect ni cascading renders.
  const [override, setOverride] = useState<{ v: Valor } | null>(null);
  const [propPrevio, setPropPrevio] = useState<Valor>(valor);
  if (valor !== propPrevio) {
    setPropPrevio(valor);
    setOverride(null);
  }
  const valorActual: Valor = override ? override.v : valor;

  // Valor crudo para el input (money/number → número liso; date → YYYY-MM-DD).
  function valorEditable(): string {
    if (valorActual === null || valorActual === undefined) return "";
    return String(valorActual);
  }

  // Texto mostrado cuando la celda está en reposo.
  function display() {
    if (valorActual === null || valorActual === undefined || valorActual === "")
      return <span className="text-pending">—</span>;
    if (tipo === "money") return formatARS(Number(valorActual));
    if (tipo === "date") return formatFechaCorta(String(valorActual));
    if (tipo === "select") {
      const op = opciones?.find((o) => o.value === String(valorActual));
      return op?.label ?? String(valorActual);
    }
    return String(valorActual);
  }

  function normalizar(bruto: string): Valor {
    const limpio = bruto.trim();
    if (limpio === "") return null;
    if (tipo === "number" || tipo === "money") {
      const n = Number(limpio);
      return Number.isNaN(n) ? null : n;
    }
    return limpio;
  }

  function commit(bruto: string) {
    const nuevo = normalizar(bruto);
    setEditando(false);
    // Sin cambios: no tocar el server.
    if (nuevo === (valorActual ?? null)) return;

    setError(false);
    setOverride({ v: nuevo }); // optimista
    startTransition(async () => {
      const res = await actualizarCampo(tabla, id, columna, nuevo);
      if (!res.ok) {
        setOverride(null); // revertir al valor del server
        setError(true);
      }
    });
  }

  if (!editando) {
    return (
      <td
        onClick={() => !pending && setEditando(true)}
        title={error ? "No se pudo guardar. Reintentá." : "Click para editar"}
        className={`cursor-pointer px-3 py-1.5 align-middle ${
          tipo === "money" || tipo === "number" ? "text-right tabular-nums" : ""
        } ${pending ? "opacity-50" : ""} ${
          error
            ? "bg-alert/10 text-alert"
            : tono === "alert"
              ? "bg-alert/10 text-alert hover:bg-alert/20"
              : tono === "warn"
                ? "bg-warn/10 text-warn hover:bg-warn/20"
                : "hover:bg-brand/5"
        }`}
      >
        <span className="inline-flex min-h-8 items-center">{display()}</span>
      </td>
    );
  }

  const claseInput =
    "min-h-8 w-full rounded border border-brand/50 bg-paper px-2 py-1 text-sm outline-none focus:border-brand";

  return (
    <td className="px-3 py-1.5 align-middle">
      {tipo === "select" ? (
        <select
          autoFocus
          defaultValue={valorActual === null ? "" : String(valorActual)}
          onChange={(e) => commit(e.target.value)}
          onBlur={() => setEditando(false)}
          className={claseInput}
        >
          {opciones?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input
          autoFocus
          type={tipo === "date" ? "date" : tipo === "text" ? "text" : "number"}
          defaultValue={valorEditable()}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            if (e.key === "Escape") setEditando(false);
          }}
          className={`${claseInput} ${
            tipo === "money" || tipo === "number" ? "text-right tabular-nums" : ""
          }`}
        />
      )}
    </td>
  );
}
