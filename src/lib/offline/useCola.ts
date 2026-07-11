"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "./db";
import { alDrenar, escucharReconexion } from "./sync";
import { subirFotosPendientes } from "./fotos";

// Fuente externa: los eventos online/offline del navegador.
function suscribir(alCambiar: () => void) {
  window.addEventListener("online", alCambiar);
  window.addEventListener("offline", alCambiar);
  return () => {
    window.removeEventListener("online", alCambiar);
    window.removeEventListener("offline", alCambiar);
  };
}

/** Estado reactivo de la cola offline para la UI. */
export function useCola() {
  // getServerSnapshot devuelve `true`: navigator no existe en SSR y así la
  // hidratación no rompe (se corrige solo si el cliente arranca offline).
  const online = useSyncExternalStore(
    suscribir,
    () => navigator.onLine,
    () => true,
  );

  useEffect(() => {
    escucharReconexion();
    // Canal binario de fotos: se dispara tras cada drenado (que a su vez corre en
    // online/visibilitychange), y un intento inicial al montar por si quedaron
    // fotos pendientes de una sesión previa.
    alDrenar(subirFotosPendientes);
    void subirFotosPendientes();
  }, []);

  const pendientes =
    useLiveQuery(() => db.cola.where("estado").equals("pendiente").count()) ?? 0;
  const errores =
    useLiveQuery(() => db.cola.where("estado").equals("error").count()) ?? 0;

  return { pendientes, errores, online };
}
