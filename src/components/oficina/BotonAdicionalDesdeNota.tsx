"use client";

import { useState, useTransition } from "react";
import { crearAdicionalDesdeNota } from "@/lib/oficina/crearAdicionalDesdeNota";

// Acción sobre una nota de diario etiquetada "extra": crea el adicional
// 'propuesto' (sin monto) linkeado a la nota. Si ya existe, muestra el estado.
export default function BotonAdicionalDesdeNota({
  diarioId,
  tieneAdicional,
}: {
  diarioId: string;
  tieneAdicional: boolean;
}) {
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  if (tieneAdicional) {
    return <span className="text-sm text-ok">✓ Adicional</span>;
  }

  return (
    <button
      type="button"
      disabled={pending}
      title={error ? "No se pudo crear. Reintentá." : undefined}
      onClick={() => {
        setError(false);
        startTransition(async () => {
          const res = await crearAdicionalDesdeNota(diarioId);
          if (!res.ok) setError(true);
        });
      }}
      className={`min-h-8 rounded border px-2 py-1 text-sm ${
        error
          ? "border-alert/50 text-alert"
          : "border-brand/50 text-brand hover:bg-brand/5"
      } disabled:opacity-50`}
    >
      Crear adicional
    </button>
  );
}
