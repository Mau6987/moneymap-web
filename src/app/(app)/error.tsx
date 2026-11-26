"use client";

import { ErrorScreen } from "@/components/error-screen";

/** Un error de una pantalla de la app (MM-182): el menú sigue a la vista. */
export default function AppError(props: { error: Error & { digest?: string }; reset: () => void }) {
  return <ErrorScreen {...props} />;
}
