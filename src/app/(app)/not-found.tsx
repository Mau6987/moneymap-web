import { ButtonLink } from "@/components/button";
import { StatusScreen } from "@/components/status-screen";

import { getMessages } from "@/lib/i18n/server";

/** 404 dentro de la app (MM-182), p. ej. un fijo de un tipo que no existe: con el menú a la vista. */
export default async function AppNotFound() {
  const t = (await getMessages()).common.status.notFound;
  return (
    <StatusScreen
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
