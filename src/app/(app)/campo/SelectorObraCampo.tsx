"use client";

import { useTransition } from "react";
import { seleccionarObra } from "@/lib/oficina/seleccionarObra";

type Obra = { id: string; nombre: string; estado: string };

// Selector de obra para campo: mismo mecanismo de cookie que el de oficina,
// pero con target táctil grande (≥48px). Solo aparece con más de una obra viva.
// Cambiar de obra necesita señal (server action); sin señal se sigue trabajando
// contra la última obra elegida.
export default function SelectorObraCampo({
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
      aria-label="Obra en la que estás trabajando"
      className={`min-h-12 w-full rounded-xl border-2 border-brand/40 bg-paper px-4 text-base font-semibold text-ink outline-none focus:border-brand ${
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
