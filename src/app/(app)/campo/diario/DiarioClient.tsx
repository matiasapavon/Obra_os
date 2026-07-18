"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type DiarioRow } from "@/lib/offline/db";
import { guardarNota, hidratarDiario } from "@/lib/offline/diario";
import { obtenerClima } from "@/lib/clima";
import ChipSync from "@/components/ChipSync";
import { useCaptura, AvisoCaptura } from "@/components/CapturaSegura";
import Button from "@/components/ui/Button";
import ChipToggle from "@/components/ui/ChipToggle";
import VolverCampo from "@/components/VolverCampo";
import { formatFechaCorta } from "@/lib/format";

// diario_obra.etiquetas guarda estos tokens; la etiqueta visible es solo
// legibilidad es-AR (mismo patrón que las unidades en materiales). "extra"
// habilita en oficina el botón "Crear adicional desde nota".
type EtiquetaValida = "incidente" | "decision" | "visita_cliente" | "extra";

const ETIQUETAS: { token: EtiquetaValida; etiqueta: string }[] = [
  { token: "incidente", etiqueta: "Incidente" },
  { token: "decision", etiqueta: "Decisión" },
  { token: "visita_cliente", etiqueta: "Visita cliente" },
  { token: "extra", etiqueta: "Trabajo extra" },
];

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
  const [etiquetas, setEtiquetas] = useState<EtiquetaValida[]>([]);
  const [guardando, setGuardando] = useState(false);

  // Clima best-effort: se pide una vez al montar y se usa lo que haya al
  // guardar (null si no hubo permiso/señal). Nunca bloquea ni agrega toques.
  const climaRef = useRef<string | null>(null);
  useEffect(() => {
    void obtenerClima().then((c) => {
      climaRef.current = c;
    });
  }, []);

  function toggleEtiqueta(token: EtiquetaValida) {
    setEtiquetas((prev) =>
      prev.includes(token) ? prev.filter((t) => t !== token) : [...prev, token],
    );
  }

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

  const { errorCaptura, capturar } = useCaptura();

  async function onGuardar(e: React.FormEvent) {
    e.preventDefault();
    const t = texto.trim();
    if (!t && !foto) return; // nada que guardar
    setGuardando(true);
    try {
      // Limpiar el form solo si el guardado local fue OK (si falló, no perder la nota).
      const ok = await capturar(() =>
        guardarNota(obraId, etapaId, t, foto ?? undefined, {
          clima: climaRef.current,
          etiquetas,
        }),
      );
      if (!ok) return;
      setTexto("");
      setFoto(null);
      setEtiquetas([]);
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

      <AvisoCaptura visible={errorCaptura} />

      <form onSubmit={onGuardar} className="flex flex-col gap-2 rounded-xl border-2 border-brand/40 p-4">
        <textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Nota"
          className="min-h-24 rounded-lg border border-line-strong px-3 py-2 text-base"
        />

        <div className="flex flex-wrap gap-2">
          {ETIQUETAS.map(({ token, etiqueta }) => (
            <ChipToggle
              key={token}
              activo={etiquetas.includes(token)}
              onClick={() => toggleEtiqueta(token)}
            >
              {etiqueta}
            </ChipToggle>
          ))}
        </div>

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

      <ul className="flex flex-col gap-2">
        {(notas ?? []).map((n) => (
          <li key={n.id} className="rounded-xl border-2 border-line px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <p className="whitespace-pre-wrap text-base text-ink">
                {n.texto || <span className="text-muted">(sin texto)</span>}
              </p>
              {diariosConFoto.has(n.id) && (
                <span className="shrink-0 text-lg" title="Con foto">📷</span>
              )}
            </div>
            <p className="mt-1 text-sm text-muted">
              {formatHora(n.captured_at)}
              {n.clima ? ` · ${n.clima}` : ""}
              {(n.etiquetas ?? []).length > 0
                ? ` · ${(n.etiquetas ?? [])
                    .map(
                      (t) =>
                        ETIQUETAS.find((e) => e.token === t)?.etiqueta ?? t,
                    )
                    .join(", ")}`
                : ""}
            </p>
          </li>
        ))}
        {notas?.length === 0 && (
          <li className="py-8 text-center text-muted">Todavía no hay notas de hoy.</li>
        )}
      </ul>
    </div>
  );
}
