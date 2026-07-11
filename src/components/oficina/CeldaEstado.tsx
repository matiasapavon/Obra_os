"use client";

import { useState, useTransition } from "react";
import { actualizarCampo } from "@/lib/oficina/actualizarCampo";
import BadgeEstado from "./BadgeEstado";

// Celda de estado editable: muestra el BadgeEstado (color semántico fijo) en
// reposo; click → select para cambiarlo. Confirma vía el mismo server action que
// CeldaEditable. Optimista con revert en error. Reúsa el patrón de CeldaEditable.
export default function CeldaEstado({
  tabla,
  id,
  valor,
  tipo,
  opciones,
}: {
  tabla: string;
  id: string;
  valor: string;
  tipo: "tareas" | "pedidos";
  opciones: { value: string; label: string }[];
}) {
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState(false);
  const [pending, startTransition] = useTransition();

  const [override, setOverride] = useState<string | null>(null);
  const [propPrevio, setPropPrevio] = useState(valor);
  if (valor !== propPrevio) {
    setPropPrevio(valor);
    setOverride(null);
  }
  const valorActual = override ?? valor;

  function commit(nuevo: string) {
    setEditando(false);
    if (nuevo === valorActual) return;
    setError(false);
    setOverride(nuevo);
    startTransition(async () => {
      const res = await actualizarCampo(tabla, id, "estado", nuevo);
      if (!res.ok) {
        setOverride(null);
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
          pending ? "opacity-50" : "hover:bg-brand/5"
        } ${error ? "bg-alert/10" : ""}`}
      >
        <BadgeEstado estado={valorActual} tipo={tipo} />
      </td>
    );
  }

  return (
    <td className="px-3 py-1.5 align-middle">
      <select
        autoFocus
        defaultValue={valorActual}
        onChange={(e) => commit(e.target.value)}
        onBlur={() => setEditando(false)}
        className="min-h-8 w-full rounded border border-brand/50 bg-paper px-2 py-1 text-sm outline-none focus:border-brand"
      >
        {opciones.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </td>
  );
}
