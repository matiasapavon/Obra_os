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
import VolverCampo from "@/components/VolverCampo";
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

// La columna materiales.unidad tiene CHECK in ('bolsa','m3','ml','un','kg','lt').
// El valor mandado a altaMaterial debe ser EXACTAMENTE uno de estos tokens (o
// null). El chip guarda el token; la etiqueta es solo legibilidad es-AR. Así un
// valor inválido es imposible de representar (no hay texto libre que rechace el
// CHECK en el sync y deje el material varado en el espejo).
type UnidadValida = "bolsa" | "m3" | "ml" | "un" | "kg" | "lt";

const UNIDADES: { token: UnidadValida; etiqueta: string }[] = [
  { token: "un", etiqueta: "Unidad" },
  { token: "bolsa", etiqueta: "Bolsa" },
  { token: "m3", etiqueta: "m³" },
  { token: "ml", etiqueta: "Metro lineal" },
  { token: "kg", etiqueta: "Kg" },
  { token: "lt", etiqueta: "Litro" },
];

export default function MaterialesClient({
  obraId,
  etapaId,
  materialesServidor,
  pedidosServidor,
}: {
  obraId: string;
  etapaId: string;
  materialesServidor: MaterialRow[];
  pedidosServidor: PedidoCampoRow[];
}) {
  const [altaAbierta, setAltaAbierta] = useState(false);
  const [nombre, setNombre] = useState("");
  const [unidad, setUnidad] = useState<UnidadValida | null>(null);

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
    await marcarFalta(obraId, etapaId, material.id);
  }

  async function onLlego(pedido: PedidoCampoRow) {
    await marcarLlego(pedido);
  }

  async function onAlta(e: React.FormEvent) {
    e.preventDefault();
    const n = nombre.trim();
    if (!n) return;
    await altaMaterial(obraId, n, unidad);
    setNombre("");
    setUnidad(null);
    setAltaAbierta(false);
  }

  const listaPedidos = pedidos ?? [];

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <VolverCampo href={`/campo/etapa/${etapaId}`} />
          <h1 className="text-xl font-bold text-ink">
            Materiales · {formatFechaCorta(new Date())}
          </h1>
        </div>
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
          <div className="flex flex-col gap-1">
            <span className="text-sm font-semibold text-muted">Unidad (opcional)</span>
            <div className="flex flex-wrap gap-2">
              {UNIDADES.map(({ token, etiqueta }) => {
                const activa = unidad === token;
                return (
                  <button
                    key={token}
                    type="button"
                    aria-pressed={activa}
                    onClick={() => setUnidad(activa ? null : token)}
                    className={`min-h-12 rounded-lg border-2 px-4 font-bold ${
                      activa
                        ? "border-brand bg-brand text-white"
                        : "border-brand/40 text-brand"
                    }`}
                  >
                    {etiqueta}
                  </button>
                );
              })}
            </div>
          </div>
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
