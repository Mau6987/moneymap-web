"use client";

import { ErrorScreen } from "@/components/error-screen";

import "./globals.css";

/**
 * Si falla el layout raíz (MM-182) no queda nada de la página, así que esta
 * trae su propio <html>. Sin el proveedor de idioma, los textos van en español.
 */
export default function GlobalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="es-BO">
      <body className="min-h-dvh font-sans antialiased">
        <ErrorScreen {...props} fullScreen />
      </body>
    </html>
  );
}
