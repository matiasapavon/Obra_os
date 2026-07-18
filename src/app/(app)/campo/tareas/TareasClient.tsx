"use client";

import { useEffect } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type TareaRow } from "@/lib/offline/db";
import { marcarAvance, hidratarTareas } from "@/lib/offline/tareas";
import ChipSync from "@/components/ChipSync";
import VolverCampo from "@/components/VolverCampo";
import { useCaptura, AvisoCaptura } from "@/components/CapturaSegura";
import Button from "@/components/ui/Button";
import { formatFechaCorta } from "@/lib/format";

const ESTILO: Record<string, { clase: string; etiqueta: string }> = {
  pendiente: { clase: "text-muted", etiqueta: "Pendiente" },
  en_curso: { clase: "text-warn", etiqueta: "En curso" },
  terminada: { clase: "text-ok", etiqueta: "Terminada" },
  bloqueada: { clase: "text-alert", etiqueta: "Bloqueada" },
};

export default function TareasClient({
  obraId,
  etapaId,
  tareasServidor,
}: {
  obraId: string;
  etapaId: string;
  tareasServidor: TareaRow[];
}) {
  // Espejar los datos del server en Dexie (solo si llegaron: sin red la página
  // se sirve del cache del SW y los props pueden venir de una carga vieja).
  useEffect(() => {
    if (tareasServidor.length > 0) {
      void hidratarTareas(tareasServidor);
    }
  }, [tareasServidor]);

  // La UI SIEMPRE lee del espejo: una sola fuente de verdad local. Filtra a las
  // tareas de esta etapa (el espejo guarda todas las de la obra); las punch
  // tienen su propia pantalla.
  const tareas = useLiveQuery(
    () =>
      db.tareas_hoy
        .where("obra_id")
        .equals(obraId)
        .filter((t) => t.etapa_id === etapaId && t.tipo !== "punch")
        .sortBy("orden"),
    [obraId, etapaId],
  );

  const { errorCaptura, capturar } = useCaptura();

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <VolverCampo href={`/campo/etapa/${etapaId}`} />
          <h1 className="text-xl font-bold text-ink">
            Tareas · {formatFechaCorta(new Date())}
          </h1>
        </div>
        <ChipSync />
      </div>

      <AvisoCaptura visible={errorCaptura} />

      <ul className="flex flex-col gap-2">
        {(tareas ?? []).map((t) => {
          const estilo = ESTILO[t.estado] ?? ESTILO.pendiente;
          // Semántica de color: solo "bloqueada" pide acción (borde rojo);
          // el resto usa borde neutro y comunica estado por el texto.
          const borde =
            t.estado === "bloqueada" ? "border-alert/60" : "border-line";
          return (
            <li
              key={t.id}
              className={`flex min-h-16 flex-col gap-2 rounded-2xl border-2 bg-paper px-4 py-3 shadow-card ${borde}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-base font-bold text-ink">{t.nombre}</span>
                <span
                  className={`text-sm font-bold tabular-nums ${estilo.clase}`}
                >
                  {t.porcentaje_avance}% · {estilo.etiqueta}
                </span>
              </div>
              {/* Barra de avance (solo lectura) + botones de step ≥48px:
                  un slider no es confiable con guantes ni al sol. */}
              <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-brand transition-[width]"
                  style={{ width: `${t.porcentaje_avance}%` }}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variante="secondary"
                  tamano="campo"
                  className="flex-1"
                  disabled={t.porcentaje_avance <= 0}
                  onClick={() =>
                    void capturar(() =>
                      marcarAvance(t, Math.max(0, t.porcentaje_avance - 25)),
                    )
                  }
                  aria-label={`Restar 25% de avance a ${t.nombre}`}
                >
                  −25%
                </Button>
                <Button
                  variante="secondary"
                  tamano="campo"
                  className="flex-1"
                  disabled={t.porcentaje_avance >= 100}
                  onClick={() =>
                    void capturar(() =>
                      marcarAvance(t, Math.min(100, t.porcentaje_avance + 25)),
                    )
                  }
                  aria-label={`Sumar 25% de avance a ${t.nombre}`}
                >
                  +25%
                </Button>
                <Button
                  variante="success"
                  tamano="campo"
                  className="flex-1"
                  onClick={() => void capturar(() => marcarAvance(t, 100))}
                >
                  Listo
                </Button>
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
