import type { MetadataRoute } from "next";

import { catalogs } from "@/lib/i18n/catalog";

/**
 * El manifest de la PWA: se instala como app, abre en el Map y usa el logo de
 * la app móvil (moneymap-app, assets/images/logo/logo.png).
 */
export default function manifest(): MetadataRoute.Manifest {
  // Uno solo para la instalación: en el idioma base.
  const messages = catalogs.es.common;
  return {
    id: "/",
    name: messages.appName,
    short_name: messages.appName,
    description: messages.appDescription,
    lang: "es-BO",
    start_url: "/map",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#eef0f3",
    theme_color: "#3e4bd2",
    categories: ["finance"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // El logo deja margen alrededor: cabe en la zona segura de los íconos adaptables.
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: messages.nav.add,
        url: "/add",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      { name: messages.nav.transactions, url: "/transactions" },
    ],
  };
}
