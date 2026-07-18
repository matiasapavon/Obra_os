"use client";

import { useState, useTransition } from "react";
import { crearGastoDesdePedido } from "@/lib/oficina/crearGastoDesdePedido";

// Celda de acción en la tabla de pedidos: crea un gasto imputado desde el pedido
// y linkea el puente. Si el pedido ya tiene gasto, muestra el estado y no repite.
export default function BotonGastoDesdePedido({
  pedidoId,
  tieneGasto,
}: {
  pedidoId: string;
  tieneGasto: boolean;
}) {
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  if (tieneGasto) {
    return (
      <td className="px-3 py-1.5 align-middle">
        <span className="text-sm text-ok">✓ Gasto</span>
      </td>
    );
  }

  return (
    <td className="px-3 py-1.5 align-middle">
      <button
        type="button"
        disabled={pending}
        title={error ? "No se pudo crear. Reintentá." : undefined}
        onClick={() => {
          setError(false);
          startTransition(async () => {
            const res = await crearGastoDesdePedido(pedidoId);
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
    </td>
  );
}
