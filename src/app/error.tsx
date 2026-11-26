"use client";

import { ErrorScreen } from "@/components/error-screen";

/** Un error fuera de la app o en su marco (MM-182): sola en la pantalla. */
export default function RootError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return <ErrorScreen {...props} fullScreen />;
}
