"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type TareaRow } from "@/lib/offline/db";
import { crearPunch, marcarAvance, hidratarTareas } from "@/lib/offline/tareas";
import ChipSync from "@/components/ChipSync";
import { useCaptura, AvisoCaptura } from "@/components/CapturaSegura";
import Button from "@/components/ui/Button";
import ChipToggle from "@/components/ui/ChipToggle";
import VolverCampo from "@/components/VolverCampo";
import { formatFechaCorta } from "@/lib/format";

export default function PunchClient({
  obraId,
  etapaId,
  punchServidor,
  gremios,
}: {
  obraId: string;
  etapaId: string;
  punchServidor: TareaRow[];
  gremios: { id: string; nombre: string }[];
}) {
  const [altaAbierta, setAltaAbierta] = useState(false);
  const [nombre, setNombre] = useState("");
  const [gremioId, setGremioId] = useState<string | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Espejar los datos del server en Dexie (solo si llegaron: sin red la página
  // se sirve del cache del SW y los props pueden venir de una carga vieja).
  useEffect(() => {
    if (punchServidor.length > 0) void hidratarTareas(punchServidor);
  }, [punchServidor]);

  // La UI SIEMPRE lee del espejo: una sola fuente de verdad local.
  const punch = useLiveQuery(
    () =>
      db.tareas_hoy
        .where("obra_id")
        .equals(obraId)
        .filter((t) => t.etapa_id === etapaId && t.tipo === "punch")
        .reverse()
        .sortBy("created_at"),
    [obraId, etapaId],
  );
  const fotos = useLiveQuery(() => db.fotos.toArray(), []);
  const punchConFoto = useMemo(
    () => new Set((fotos ?? []).map((f) => f.tarea_id).filter(Boolean)),
    [fotos],
  );

  const previewUrl = useMemo(
    () => (foto ? URL.createObjectURL(foto) : null),
    [foto],
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const { errorCaptura, capturar } = useCaptura();

  async function onAlta(e: React.FormEvent) {
    e.preventDefault();
    const n = nombre.trim();
    if (!n) return;
    setGuardando(true);
    try {
      // Limpiar el form solo si el guardado local fue OK (si falló, no perder lo cargado).
      const ok = await capturar(() =>
        crearPunch(obraId, etapaId, n, gremioId, foto ?? undefined),
      );
      if (!ok) return;
      setNombre("");
      setGremioId(null);
      setFoto(null);
      setAltaAbierta(false);
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3 px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <VolverCampo href={`/campo/etapa/${etapaId}`} />
          <h1 className="text-xl font-bold text-ink">
            Punch · {formatFechaCorta(new Date())}
          </h1>
        </div>
        <ChipSync />
      </div>

      <AvisoCaptura visible={errorCaptura} />

      {!altaAbierta ? (
        <button
          type="button"
          onClick={() => setAltaAbierta(true)}
          className="min-h-12 rounded-lg border-2 border-dashed border-brand/50 font-bold text-brand"
        >
          + Pendiente de cierre
        </button>
      ) : (
        <form
          onSubmit={onAlta}
          className="flex flex-col gap-2 rounded-xl border-2 border-brand/40 p-4"
        >
          <input
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Qué hay que arreglar"
            className="min-h-12 rounded-lg border border-line-strong px-3 text-base"
          />

          {gremios.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {gremios.map((g) => {
                const activo = gremioId === g.id;
                return (
                  <ChipToggle
                    key={g.id}
                    activo={activo}
                    onClick={() => setGremioId(activo ? null : g.id)}
                  >
                    {g.nombre}
                  </ChipToggle>
                );
              })}
            </div>
          )}

          <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-brand/50 font-bold text-brand">
            📷 Foto
            <input
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => setFoto(e.target.files?.[0] ?? null)}
            />
          </label>

          {previewUrl && (
            <div className="flex items-center gap-3">
              <div
                className="h-16 w-16 rounded-lg border border-line bg-cover bg-center"
                style={{ backgroundImage: `url(${previewUrl})` }}
              />
              <button
                type="button"
                onClick={() => setFoto(null)}
                className="text-sm font-semibold text-muted"
              >
                Quitar foto
              </button>
            </div>
          )}

          <Button variante="primary" tamano="campo" type="submit" disabled={guardando}>
            Guardar
          </Button>
        </form>
      )}

      <ul className="flex flex-col gap-2">
        {(punch ?? []).map((p) => {
          const resuelto = p.estado === "terminada";
          return (
            <li
              key={p.id}
              className={`flex min-h-16 items-center justify-between gap-3 rounded-xl border-2 px-4 py-3 ${
                resuelto
                  ? "border-ok/40 bg-ok/5"
                  : "border-alert/40 bg-alert/5"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                {punchConFoto.has(p.id) && (
                  <span className="shrink-0 text-lg" title="Con foto">📷</span>
                )}
                <div className="flex min-w-0 flex-col">
                  <span
                    className={`truncate text-base font-bold ${
                      resuelto ? "text-muted line-through" : "text-ink"
                    }`}
                  >
                    {p.nombre}
                  </span>
                  {p.gremio_id && (
                    <span className="text-sm text-muted">
                      {gremios.find((g) => g.id === p.gremio_id)?.nombre ?? ""}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() =>
                  void capturar(() => marcarAvance(p, resuelto ? 0 : 100))
                }
                className={`min-h-12 shrink-0 rounded-lg px-4 font-bold text-white ${
                  resuelto ? "bg-pending" : "bg-ok"
                }`}
              >
                {resuelto ? "Reabrir" : "Resuelto"}
              </button>
            </li>
          );
        })}
        {punch?.length === 0 && (
          <li className="py-8 text-center text-muted">
            No hay pendientes de cierre en esta etapa.
          </li>
        )}
      </ul>
    </div>
  );
}
