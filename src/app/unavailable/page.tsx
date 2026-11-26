import { ButtonLink } from "@/components/button";
import { StatusScreen } from "@/components/status-screen";

import { safeReturn } from "@/lib/api/unavailable";
import { getMessages } from "@/lib/i18n/server";

/**
 * "MoneyMap no responde" (MM-182): a donde lleva `withAccessToken` cuando la
 * API no contesta o responde 502, 503 o 504. Reintentar vuelve a la pantalla
 * de la que venía. No muestra datos del usuario.
 */
export default async function UnavailablePage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const t = (await getMessages()).common.status.unavailable;
  const { from } = await searchParams;
  return (
    <StatusScreen
      fullScreen
      icon="cloud-off"
      title={t.title}
      body={t.body}
      actions={
        <ButtonLink href={safeReturn(from)} size="md">
          {t.retry}
        </ButtonLink>
      }
    />
  );
}
