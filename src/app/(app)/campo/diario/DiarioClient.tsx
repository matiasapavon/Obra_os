"use client";

import { useEffect, useMemo, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type DiarioRow } from "@/lib/offline/db";
import { guardarNota, hidratarDiario } from "@/lib/offline/diario";
import ChipSync from "@/components/ChipSync";
import VolverCampo from "@/components/VolverCampo";
import { formatFechaCorta } from "@/lib/format";

/** "14:35" en hora de Argentina, a partir de un ISO. */
function formatHora(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export default function DiarioClient({
  obraId,
  etapaId,
  diariosServidor,
}: {
  obraId: string;
  etapaId: string;
  diariosServidor: DiarioRow[];
}) {
  const [texto, setTexto] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [guardando, setGuardando] = useState(false);

  // Espejar las notas del server en Dexie (solo si llegaron: sin red la página
  // se sirve del cache del SW y los props pueden venir de una carga vieja).
  useEffect(() => {
    if (diariosServidor.length > 0) void hidratarDiario(diariosServidor);
  }, [diariosServidor]);

  // La UI SIEMPRE lee del espejo: una sola fuente de verdad local.
  const notas = useLiveQuery(
    () =>
      db.diario_hoy
        .where("obra_id")
        .equals(obraId)
        .filter((n) => n.etapa_id === etapaId)
        .reverse()
        .sortBy("captured_at"),
    [obraId, etapaId],
  );
  const fotos = useLiveQuery(() => db.fotos.toArray(), []);
  const diariosConFoto = useMemo(
    () => new Set((fotos ?? []).map((f) => f.diario_id).filter(Boolean)),
    [fotos],
  );

  // Preview local de la foto elegida (object URL, se revoca al cambiar/desmontar).
  const previewUrl = useMemo(
    () => (foto ? URL.createObjectURL(foto) : null),
    [foto],
  );
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function onGuardar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t && !foto) return; // nada que guardar
    setGuardando(true);
    try {
      await guardarNota(obraId, etapaId, t, foto ?? undefined);
      setTexto("");
      setFoto(null);
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
            Diario · {formatFechaCorta(new Date())}
          </h1>
        </div>
        <ChipSync />
      </div>

      <form onSubmit={onGuardar} className="flex flex-col gap-2 rounded-xl border-2 border-brand/40 p-4">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nota"
          className="min-h-24 rounded-lg border border-black/20 px-3 py-2 text-base"
        />

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
              className="h-16 w-16 rounded-lg border border-black/10 bg-cover bg-center"
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

        <button
          type="submit"
          disabled={guardando}
          className="min-h-12 rounded-lg bg-brand font-bold text-white disabled:opacity-50"
        >
          Guardar
        </button>
      </form>

      <ul className="flex flex-col gap-2">
        {(notas ?? []).map((n) => (
          <li key={n.id} className="rounded-xl border-2 border-black/10 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <p className="whitespace-pre-wrap text-base text-ink">
                {n.texto || <span className="text-muted">(sin texto)</span>}
              </p>
              {diariosConFoto.has(n.id) && (
                <span className="shrink-0 text-lg" title="Con foto">📷</span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">{formatHora(n.captured_at)}</p>
          </li>
        ))}
        {notas?.length === 0 && (
          <li className="py-8 text-center text-muted">Todavía no hay notas de hoy.</li>
        )}
      </ul>
    </div>
  );
}
