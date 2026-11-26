import { ButtonLink } from "@/components/button";
import { StatusScreen } from "@/components/status-screen";

import { getMessages } from "@/lib/i18n/server";

/** 404 de una ruta que no existe (MM-182): sola en la pantalla. */
export default async function NotFound() {
  const t = (await getMessages()).common.status.notFound;
  return (
    <StatusScreen
      fullScreen
      icon="map-off"
      code={t.code}
      title={t.title}
      body={t.body}
      actions={
        <ButtonLink href="/map" size="md">
          {t.home}
        </ButtonLink>
      }
    />
  );
}
