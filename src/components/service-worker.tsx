"use client";

import { useEffect } from "react";

/** Registra el service worker de la PWA (`public/sw.js`), solo en producción. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Sin service worker la web funciona igual; no se instala como app.
    });
  }, []);
  return null;
}
