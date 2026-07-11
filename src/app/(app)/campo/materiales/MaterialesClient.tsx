"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type MaterialRow, type PedidoCampoRow } from "@/lib/offline/db";
import {
  altaMaterial,
  marcarFalta,
  marcarLlego,
  hidratarMateriales,
  ultimoPedido,
  faltanteAbierto,
} from "@/lib/offline/materiales";
import ChipSync from "@/components/ChipSync";
import { formatFechaCorta } from "@/lib/format";

// Estado visible del material según su último pedido. Semántica de color fija.
const ESTILO = {
  ok: { clase: "border-ok bg-ok/10 text-ok", etiqueta: "Entregado" },
  falta: { clase: "border-alert bg-alert/10 text-alert", etiqueta: "Falta" },
  nada: { clase: "border-pending/50 bg-pending/10 text-muted", etiqueta: "En obra" },
} as const;

function estadoVisible(pedido: PedidoCampoRow | undefined): keyof typeof ESTILO {
  if (!pedido) return "nada";
  if (pedido.estado === "faltante") return "falta";
  if (pedido.estado === "entregado") return "ok";
  return "nada";
}

export default function MaterialesClient({
  obraId,
  materialesServidor,
  pedidosServidor,
}: {
  obraId: string;
  materialesServidor: MaterialRow[];
  pedidosServidor: PedidoCampoRow[];
}) {
  const [altaAbierta, setAltaAbierta] = useState(false);
  const [nombre, setNombre] = useState("");
  const [unidad, setUnidad] = useState("");

  // Espejar los datos del server en Dexie (solo si llegaron: sin red la página
  // se sirve del cache del SW y los props pueden venir de una carga vieja).
  useEffect(() => {
    if (materialesServidor.length > 0 || pedidosServidor.length > 0) {
      void hidratarMateriales(materialesServidor, pedidosServidor);
    }
  }, [materialesServidor, pedidosServidor]);

  // La UI SIEMPRE lee del espejo: una sola fuente de verdad local.
  const materiales = useLiveQuery(
    () => db.materiales.where("obra_id").equals(obraId).sortBy("nombre"),
    [obraId],
  );
  const pedidos = useLiveQuery(
    () => db.pedidos_campo.where("obra_id").equals(obraId).toArray(),
    [obraId],
  );

  async function onFalta(material: MaterialRow) {
    await marcarFalta(obraId, material.id);
  }

  async function onLlego(pedido: PedidoCampoRow) {
    await marcarLlego(pedido);
  }

  async function onAlta(e: React.FormEvent) {
    e.preventDefault();
    const n = nombre.trim();
    if (!n) return;
    await altaMaterial(obraId, n, unidad.trim() || null);
    setNombre("");
    setUnidad("");
    setAltaAbierta(false);
  }

  const listaPedidos = pedidos ?? [];

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-ink">
          Materiales · {formatFechaCorta(new Date())}
        </h1>
        <ChipSync />
      </div>

      <ul className="flex flex-col gap-2">
        {(materiales ?? []).map((m) => {
          const pedido = ultimoPedido(listaPedidos, m.id);
          const abierto = faltanteAbierto(listaPedidos, m.id);
          const { clase, etiqueta } = ESTILO[estadoVisible(pedido)];
          return (
            <li
              key={m.id}
              className={`flex min-h-14 items-center justify-between gap-2 rounded-xl border-2 px-4 py-2 ${clase}`}
            >
              <div className="min-w-0">
                <div className="truncate text-base font-semibold text-ink">
                  {m.nombre}
                  {m.unidad && (
                    <span className="ml-2 text-sm font-normal text-muted">{m.unidad}</span>
                  )}
                </div>
                <span className="text-sm font-bold">{etiqueta}</span>
              </div>
              {abierto ? (
                <button
                  type="button"
                  onClick={() => void onLlego(abierto)}
                  className="min-h-12 shrink-0 rounded-lg bg-ok px-4 font-bold text-white"
                >
                  LLEGÓ
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void onFalta(m)}
                  className="min-h-12 shrink-0 rounded-lg border-2 border-alert px-4 font-bold text-alert"
                >
                  FALTA
                </button>
              )}
            </li>
          );
        })}
        {materiales?.length === 0 && (
          <li className="py-8 text-center text-muted">
            Todavía no hay materiales cargados en esta obra.
          </li>
        )}
      </ul>

      {altaAbierta ? (
        <form onSubmit={onAlta} className="flex flex-col gap-2 rounded-xl border-2 border-brand/40 p-4">
          <input
            autoFocus
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre"
            className="min-h-12 rounded-lg border border-black/20 px-3 text-base"
          />
          <input
            value={unidad}
            onChange={(e) => setUnidad(e.target.value)}
            placeholder="Unidad (opcional: bolsa, m3, un…)"
            className="min-h-12 rounded-lg border border-black/20 px-3 text-base"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="min-h-12 flex-1 rounded-lg bg-brand font-bold text-white"
            >
              Agregar
            </button>
            <button
              type="button"
              onClick={() => setAltaAbierta(false)}
              className="min-h-12 rounded-lg px-4 font-semibold text-muted"
            >
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAltaAbierta(true)}
          className="min-h-12 rounded-xl border-2 border-dashed border-brand/50 font-bold text-brand"
        >
          + Material
        </button>
      )}
    </div>
  );
}
