"use client";

import { useState, useTransition } from "react";
import { crearFila } from "@/lib/oficina/crearFila";

type Tipo = "text" | "number" | "money" | "date" | "select";

export type CampoAlta = {
  key: string;
  label: string;
  tipo?: Tipo;
  opciones?: { value: string; label: string }[];
  requerido?: boolean;
};

// Alta de una fila desde oficina: botón "+ Agregar" que despliega un form
// inline con los campos mínimos. El insert corre por el server action con
// allow-list; al ok el revalidatePath del action trae la fila nueva.
export default function FormAlta({
  tabla,
  campos,
  etiqueta = "Agregar",
}: {
  tabla: string;
  campos: CampoAlta[];
  etiqueta?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const datos = new FormData(form);
    const valores: Record<string, string | number | null> = {};
    for (const c of campos) {
      const bruto = String(datos.get(c.key) ?? "").trim();
      if (bruto === "") {
        valores[c.key] = null;
        continue;
      }
      valores[c.key] =
        c.tipo === "number" || c.tipo === "money" ? Number(bruto) : bruto;
    }
    setError(null);
    startTransition(async () => {
      const res = await crearFila(tabla, valores);
      if (!res.ok) {
        setError(res.error ?? "No se pudo guardar");
        return;
      }
      form.reset();
      setAbierto(false);
    });
  }

  if (!abierto) {
    return (
      <div className="mb-3">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="min-h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand/90"
        >
          + {etiqueta}
        </button>
      </div>
    );
  }

  const claseInput =
    "min-h-10 rounded border border-brand/50 bg-paper px-2 py-1 text-sm outline-none focus:border-brand";

  return (
    <form
      onSubmit={onSubmit}
      className="mb-3 flex flex-wrap items-end gap-2 rounded-lg border border-brand/30 bg-brand/5 p-3"
    >
      {campos.map((c) => (
        <label key={c.key} className="flex flex-col gap-1 text-xs text-muted">
          {c.label}
          {c.tipo === "select" ? (
            <select name={c.key} required={c.requerido} className={claseInput}>
              {!c.requerido && <option value="">—</option>}
              {c.opciones?.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              name={c.key}
              required={c.requerido}
              type={
                c.tipo === "date"
                  ? "date"
                  : c.tipo === "number" || c.tipo === "money"
                    ? "number"
                    : "text"
              }
              step={c.tipo === "money" ? "0.01" : undefined}
              className={`${claseInput} ${
                c.tipo === "number" || c.tipo === "money"
                  ? "text-right tabular-nums"
                  : ""
              }`}
            />
          )}
        </label>
      ))}
      <button
        type="submit"
        disabled={pending}
        className="min-h-10 rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:bg-brand/90 disabled:opacity-50"
      >
        Guardar
      </button>
      <button
        type="button"
        onClick={() => {
          setAbierto(false);
          setError(null);
        }}
        className="min-h-10 rounded-lg border border-black/15 px-4 text-sm text-muted hover:bg-black/5"
      >
        Cancelar
      </button>
      {error && <p className="w-full text-sm text-alert">{error}</p>}
    </form>
  );
}
