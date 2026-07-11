"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type TareaRow } from "@/lib/offline/db";
import { marcarAvance, hidratarTareas } from "@/lib/offline/tareas";
import ChipSync from "@/components/ChipSync";
import { formatFechaCorta } from "@/lib/format";

const ESTILO: Record<string, { clase: string; etiqueta: string }> = {
  pendiente: { clase: "text-muted", etiqueta: "Pendiente" },
  en_curso: { clase: "text-warn", etiqueta: "En curso" },
  terminada: { clase: "text-ok", etiqueta: "Terminada" },
  bloqueada: { clase: "text-alert", etiqueta: "Bloqueada" },
};

export default function TareasClient({
  obraId,
  tareasServidor,
}: {
  obraId: string;
  tareasServidor: TareaRow[];
}) {
  // Espejar los datos del server en Dexie (solo si llegaron: sin red la página
  // se sirve del cache del SW y los props pueden venir de una carga vieja).
  useEffect(() => {
    if (tareasServidor.length > 0) {
      void hidratarTareas(tareasServidor);
    }
  }, [tareasServidor]);

  // La UI SIEMPRE lee del espejo: una sola fuente de verdad local.
  const tareas = useLiveQuery(
    () => db.tareas_hoy.where("obra_id").equals(obraId).sortBy("orden"),
    [obraId],
  );

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold text-ink">
          Tareas · {formatFechaCorta(new Date())}
        </h1>
        <ChipSync />
      </div>

      <ul className="flex flex-col gap-2">
        {(tareas ?? []).map((t) => {
          const estilo = ESTILO[t.estado] ?? ESTILO.pendiente;
          return (
            <li
              key={t.id}
              className="flex min-h-16 flex-col gap-2 rounded-xl border-2 border-pending/40 bg-pending/5 px-4 py-3"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-bold text-ink">{t.nombre}</span>
                <span className={`text-sm font-bold ${estilo.clase}`}>
                  {t.porcentaje_avance}% · {estilo.etiqueta}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={25}
                  value={t.porcentaje_avance}
                  onChange={(e) => void marcarAvance(t, Number(e.target.value))}
                  className="h-3 w-full accent-brand"
                  aria-label={`Avance de ${t.nombre}`}
                />
                <button
                  type="button"
                  onClick={() => void marcarAvance(t, 100)}
                  className="min-h-12 shrink-0 rounded-lg bg-ok px-4 font-bold text-white"
                >
                  Listo
                </button>
              </div>
            </li>
          );
        })}
        {tareas?.length === 0 && (
          <li className="py-8 text-center text-muted">No hay tareas para hoy.</li>
        )}
      </ul>
    </div>
  );
}
