"use client";

import { useCola } from "@/lib/offline/useCola";
import { reintentarErrores } from "@/lib/offline/sync";

// Chip de estado de la cola offline. Tap = reintento manual (útil si quedaron errores).
export default function ChipSync() {
  const { pendientes, errores, online } = useCola();

  let clase = "bg-ok/15 text-ok";
  let texto = "Sincronizado";
  if (!online) {
    clase = "bg-pending/20 text-muted";
    texto = pendientes > 0 ? `Sin señal · ${pendientes}` : "Sin señal";
  } else if (errores > 0) {
    clase = "bg-warn/20 text-warn";
    texto = `${errores} con error`;
  } else if (pendientes > 0) {
    clase = "bg-warn/20 text-warn";
    texto = `${pendientes} pendientes`;
  }

  return (
    <button
      type="button"
      onClick={() => void reintentarErrores()}
      className={`min-h-12 rounded-full px-4 text-sm font-semibold ${clase}`}
    >
      {texto}
    </button>
  );
}
