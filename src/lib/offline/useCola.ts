"use client";

import { useEffect, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { escucharReconexion } from "./sync";

/** Estado reactivo de la cola offline para la UI. */
export function useCola() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    escucharReconexion();
    // Arranca en `true` para no romper la hidratación (navigator no existe en SSR)
    // y se corrige una sola vez al montar; el guard de deps vacías evita cascada.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  const pendientes =
    useLiveQuery(() => db.cola.where("estado").equals("pendiente").count()) ?? 0;
  const errores =
    useLiveQuery(() => db.cola.where("estado").equals("error").count()) ?? 0;

  return { pendientes, errores, online };
}
