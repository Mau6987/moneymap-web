import { plansGateway } from "@/features/billing/data/plans-gateway";
import { amountsHidden } from "@/lib/privacy";
import { formatMoney } from "@/lib/money/money";
import { randomUUID } from "node:crypto";

import { mapGateway } from "@/features/map/data/map-gateway";
import { isoToday } from "@/features/map/domain/map";
import { byUse } from "@/features/quick-add/domain/categories";
import { registerTransaction } from "@/features/quick-add/quick-add-action";
import { transactionsGateway } from "@/features/transactions/data/transactions-gateway";
import { AddTabs } from "@/features/voice/components/add-tabs";
import { withAccessToken } from "@/lib/auth/session";

import { CurrencyCatalog } from "@/lib/money/currency";

/**
 * Quick Add (spec 002, RF-4 y RF-5; mockup "Web-Registrar") y el registro por
 * voz (spec 012 del back; mockups "Web-Voz" y "Web-Voz-Confirmar").
 */
export default async function AddPage() {
  const { accounts, categories, voice } = await withAccessToken(async (token) => {
    const [accounts, categories, currencies, preferences, recent, plan] = await Promise.all([
      transactionsGateway().accounts(token),
      mapGateway().categories(token),
      mapGateway().currencies(token),
      mapGateway()
        .preferences(token)
        .catch(() => null),
      // MM-176: las categorías más usadas en los últimos movimientos van primero.
      transactionsGateway()
        .list(token, { limit: 100 })
        .then((page) => page.items)
        .catch(() => []),
      // Como la app: cuántos dictados lleva el mes y si el plan incluye la voz.
      plansGateway()
        .mine(token)
        .catch(() => null),
    ]);
    const feature = plan?.features.find((f) => f.key === "ai.voice_entries");
    const hiddenAmounts = await amountsHidden(preferences);
    const catalog = new CurrencyCatalog(currencies);
    return {
      voice: feature
        ? { enabled: feature.enabled, used: feature.used, limit: feature.limit }
        : null,
      categories: byUse(categories, recent).map(({ id, name, type, color, icon }) => ({
        id,
        name,
        type,
        color,
        icon,
      })),
      accounts: accounts
        .filter((a) => !a.archived_at)
        .map((a) => ({
          id: a.id,
          name: a.name,
          currency: a.currency,
          label: catalog.labelOf(a.currency),
          decimals: catalog.decimalsOf(a.currency),
          isDefault: a.is_default,
          balance: formatMoney(a.current_balance, a.currency, catalog, {
            hidden: hiddenAmounts,
          }),
        })),
    };
  });

  return (
    <>
      <AddTabs
        voice={voice}
        action={registerTransaction}
        accounts={accounts}
        categories={categories}
        today={isoToday()}
        idempotencyKey={randomUUID()}
      />
    </>
  );
}
