"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type AsistenciaRow, type PersonalRow } from "@/lib/offline/db";
import {
  estadoDeFila,
  marcarAsistencia,
  altaPersona,
  hidratarEspejo,
  SIGUIENTE_ESTADO,
  type EstadoAsistencia,
} from "@/lib/offline/asistencia";
import ChipSync from "@/components/ChipSync";
import { useCaptura, AvisoCaptura } from "@/components/CapturaSegura";
import Button from "@/components/ui/Button";
import VolverCampo from "@/components/VolverCampo";
import { formatFechaCorta } from "@/lib/format";

// Color pleno (borde + fondo) solo para estados que piden acción; los demás
// llevan borde neutro y comunican por tinte de fondo + etiqueta.
const ESTILO: Record<EstadoAsistencia, { clase: string; etiqueta: string }> = {
  pendiente: { clase: "border-line bg-paper text-muted", etiqueta: "Sin marcar" },
  presente: { clase: "border-line bg-ok/10 text-ok", etiqueta: "Presente" },
  medio: { clase: "border-line bg-warn/10 text-warn", etiqueta: "Medio día" },
  ausente: { clase: "border-alert bg-alert/10 text-alert", etiqueta: "Ausente" },
};

export default function AsistenciaClient({
  obraId,
  etapaId,
  personalServidor,
  asistenciasServidor,
}: {
  obraId: string;
  etapaId: string;
  personalServidor: PersonalRow[];
  asistenciasServidor: AsistenciaRow[];
}) {
  const [altaAbierta, setAltaAbierta] = useState(false);
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState("");

  // Espejar los datos del server en Dexie (solo si llegaron: sin red la página
  // se sirve del cache del SW y los props pueden venir de una carga vieja).
  useEffect(() => {
    if (personalServidor.length > 0 || asistenciasServidor.length > 0) {
      void hidratarEspejo(personalServidor, asistenciasServidor);
    }
  }, [personalServidor, asistenciasServidor]);

  // La UI SIEMPRE lee del espejo: una sola fuente de verdad local.
  const personal = useLiveQuery(
    () => db.personal.where("obra_id").equals(obraId).sortBy("nombre"),
    [obraId],
  );
  const asistencias = useLiveQuery(() => db.asistencias_hoy.toArray(), []);

  const filaDe = (personalId: string) =>
    asistencias?.find((a) => a.personal_id === personalId);

  const { errorCaptura, capturar } = useCaptura();

  async function onTap(persona: PersonalRow) {
    const fila = filaDe(persona.id);
    const siguiente = SIGUIENTE_ESTADO[estadoDeFila(fila)];
    await capturar(() =>
      marcarAsistencia(obraId, etapaId, persona.id, siguiente, fila),
    );
  }

  async function onAlta(e: React.FormEvent) {
    e.preventDefault();
    const n = nombre.trim();
    if (!n) return;
    // Limpiar el form solo si el guardado local fue OK (si falló, no perder lo tipeado).
    const ok = await capturar(() => altaPersona(obraId, n, rol.trim() || null));
    if (!ok) return;
    setNombre("");
    setRol("");
    setAltaAbierta(false);
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <VolverCampo href={`/campo/etapa/${etapaId}`} />
          <h1 className="text-xl font-bold text-ink">
            Asistencia · {formatFechaCorta(new Date())}
          </h1>
        </div>
        <ChipSync />
      </div>

      <AvisoCaptura visible={errorCaptura} />

      <ul className="flex flex-col gap-2">
        {(personal ?? []).map((p) => {
          const estado = estadoDeFila(filaDe(p.id));
          const { clase, etiqueta } = ESTILO[estado];
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => void onTap(p)}
                className={`flex min-h-14 w-full items-center justify-between rounded-xl border-2 px-4 text-left ${clase}`}
              >
                <span className="text-base font-semibold text-ink">
                  {p.nombre}
                  {p.rol && <span className="ml-2 text-sm font-normal text-muted">{p.rol}</span>}
                </span>
                <span className="text-sm font-bold">{etiqueta}</span>
              </button>
            </li>
          );
        })}
        {personal?.length === 0 && (
          <li className="py-8 text-center text-muted">
            Todavía no hay nadie cargado en esta obra.
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
            className="min-h-12 rounded-lg border border-line-strong px-3 text-base"
          />
          <input
            value={rol}
            onChange={(e) => setRol(e.target.value)}
            placeholder="Rol (opcional)"
            className="min-h-12 rounded-lg border border-line-strong px-3 text-base"
          />
          <div className="flex gap-2">
            <Button variante="primary" tamano="campo" type="submit" className="flex-1">
              Agregar
            </Button>
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
          + Persona
        </button>
      )}
    </div>
  );
}
