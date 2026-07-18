"use client";

import { useTransition } from "react";
import { seleccionarObra } from "@/lib/oficina/seleccionarObra";

type Obra = { id: string; nombre: string; estado: string };

// Selector de obra del header de la oficina. Solo aparece cuando hay más de una
// obra viva (con una sola no aporta). Cambiar la opción fija el cookie vía el
// server action, que revalida todo /oficina — las páginas se re-resuelven con la
// obra nueva.
export default function SelectorObra({
  obras,
  actual,
}: {
  obras: Obra[];
  actual: string | null;
}) {
  const [pending, startTransition] = useTransition();

  if (obras.length <= 1) return null;

  return (
    <select
      value={actual ?? ""}
      disabled={pending}
      onChange={(e) =>
        startTransition(() => {
          void seleccionarObra(e.target.value);
        })
      }
      aria-label="Obra en foco"
      className={`min-h-9 rounded-lg border border-line-strong bg-paper px-3 py-1.5 text-sm font-semibold text-ink outline-none focus:border-brand ${
        pending ? "opacity-50" : ""
      }`}
    >
      {obras.map((o) => (
        <option key={o.id} value={o.id}>
          {o.nombre}
          {o.estado !== "activa" ? ` (${o.estado})` : ""}
        </option>
      ))}
    </select>
  );
}
