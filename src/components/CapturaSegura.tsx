"use client";

import { useCallback, useState } from "react";

/**
 * Guardado local con feedback. Todo lo que se captura en campo escribe primero
 * en Dexie; si esa escritura falla (storage lleno, modo privado, WebKit ITP),
 * el tap NO puede parecer aceptado: el dato se perdería en silencio.
 * `capturar` envuelve la acción y devuelve true solo si guardó.
 */
export function useCaptura() {
  const [errorCaptura, setErrorCaptura] = useState(false);
  const capturar = useCallback(async (accion: () => Promise<void>) => {
    try {
      await accion();
      setErrorCaptura(false);
      return true;
    } catch {
      setErrorCaptura(true);
      return false;
    }
  }, []);
  return { errorCaptura, capturar };
}

/** Banner de error de guardado local (rojo = acción requerida). */
export function AvisoCaptura({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <p
      role="alert"
      className="rounded-xl border-2 border-alert bg-alert/10 px-4 py-3 text-base font-bold text-alert"
    >
      No se pudo guardar en el teléfono. Tocá de nuevo.
    </p>
  );
}
