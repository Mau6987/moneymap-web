import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // No revelamos el framework en las respuestas.
  poweredByHeader: false,
  // BUG-034: sin el botón "N" de Next.js abajo a la izquierda en `next dev`.
  devIndicators: false,
  // El build del pre-push va a otra carpeta (NEXT_DIST_DIR=.next-check): si
  // escribiera en .next, rompería el `next dev` que esté corriendo.
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Servidor autocontenido solo para la imagen de Docker: en Windows, armarlo
  // pide permiso para crear symlinks y rompe el build local.
  output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,
  experimental: {
    // Un dictado de un minuto pasa el megabyte por defecto de las server
    // actions en Safari (graba mp4); la API acepta hasta 2 MB. La foto de un
    // comprobante, hasta 5 MB (spec 014 del back).
    serverActions: { bodySizeLimit: "6mb" },
  },
};

export default nextConfig;
