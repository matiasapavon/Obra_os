"use client";

import { useRef, useState } from "react";
import { guardarTicket } from "@/lib/offline/tickets";

// Botón del hub de etapa: foto del ticket/comprobante en 1 toque (abre cámara
// directo). Sin montos ni formulario — la plata se completa en oficina.
export default function BotonTicket({ obraId }: { obraId: string }) {
  const [guardado, setGuardado] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  async function onFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permitir sacar otro ticket seguido
    if (!archivo) return;
    await guardarTicket(obraId, archivo);
    setGuardado(true);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => setGuardado(false), 3000);
  }

  return (
    <label className="flex min-h-16 cursor-pointer items-center justify-between rounded-2xl border-2 border-black/10 px-5">
      <div className="flex items-center gap-3">
        <span className="text-2xl">🧾</span>
        <div className="flex flex-col">
          <span className="text-lg font-bold text-ink">Ticket</span>
          <span className={`text-sm ${guardado ? "font-semibold text-ok" : "text-muted"}`}>
            {guardado ? "Guardado, se imputa en oficina ✓" : "Foto del comprobante"}
          </span>
        </div>
      </div>
      <span className="text-2xl text-brand">📷</span>
      <input
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFoto}
      />
    </label>
  );
}
