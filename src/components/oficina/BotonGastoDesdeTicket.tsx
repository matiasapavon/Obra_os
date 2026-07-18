"use client";

import { useState, useTransition } from "react";
import { crearGastoDesdeTicket } from "@/lib/oficina/crearGastoDesdeTicket";

// Acción sobre un ticket de campo pendiente: crea el gasto (monto 0, rubro
// "Sin clasificar", comprobante = la foto) y linkea fotos.gasto_id.
export default function BotonGastoDesdeTicket({ fotoId }: { fotoId: string }) {
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      title={error ? "No se pudo crear. Reintentá." : undefined}
      onClick={() => {
        setError(false);
        startTransition(async () => {
          const res = await crearGastoDesdeTicket(fotoId);
          if (!res.ok) setError(true);
        });
      }}
      className={`min-h-8 rounded border px-2 py-1 text-sm ${
        error
          ? "border-alert/50 text-alert"
          : "border-brand/50 text-brand hover:bg-brand/5"
      } disabled:opacity-50`}
    >
      Crear gasto
    </button>
  );
}
