"use client";

import { useState } from "react";

// Link del reporte público de la obra (/r/[token]) con botón copiar, para
// mandarlo al cliente por WhatsApp. El token es una capability: quien tiene
// el link ve el reporte (sin plata). Rotarlo = update de obras.token_reporte.
export default function LinkReporte({ token }: { token: string }) {
  const [copiado, setCopiado] = useState(false);
  const ruta = `/r/${token}`;

  async function copiar() {
    const url = `${window.location.origin}${ruta}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Sin permiso de clipboard: el link queda visible para copiar a mano.
    }
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-muted">Reporte para el cliente:</span>
      <a
        href={ruta}
        target="_blank"
        rel="noreferrer"
        className="truncate font-mono text-brand underline"
      >
        {ruta}
      </a>
      <button
        type="button"
        onClick={() => void copiar()}
        className={`min-h-8 shrink-0 rounded border px-2 py-1 ${
          copiado
            ? "border-ok/50 text-ok"
            : "border-brand/50 text-brand hover:bg-brand/5"
        }`}
      >
        {copiado ? "✓ Copiado" : "Copiar link"}
      </button>
    </div>
  );
}
