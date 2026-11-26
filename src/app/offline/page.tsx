import { StatusScreen } from "@/components/status-screen";

import { useServerMessages } from "@/lib/i18n/server";

/**
 * "Sin conexión": la única página que guarda el service worker. No tiene datos
 * del usuario, así que se puede mostrar sin red. Con el diseño de las
 * pantallas de estado (MM-182).
 */
export const dynamic = "force-static";

export default function OfflinePage() {
  const messages = useServerMessages().common;
  return (
    <StatusScreen
      fullScreen
      icon="wifi-off"
      title={messages.offline.title}
      body={messages.offline.body}
      actions={
        <a
          href="/map"
          className="focus-ring bg-primary inline-flex h-11 items-center rounded-full px-5 text-sm font-bold text-white"
        >
          {messages.offline.retry}
        </a>
      }
    />
  );
}
