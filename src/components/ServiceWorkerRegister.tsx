"use client";

import { useEffect } from "react";

// Registra el service worker solo en producción (en dev evita cachear mientras se trabaja).
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (
      typeof navigator !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* sin SW no pasa nada grave */
      });
    }
  }, []);

  return null;
}
