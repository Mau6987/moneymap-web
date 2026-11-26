import { amountsHidden } from "@/lib/privacy";
import { formatMoney } from "@/lib/money/money";
import { randomUUID } from "node:crypto";

import { GlassCard } from "@/components/glass-card";
import { mapGateway } from "@/features/map/data/map-gateway";
import { isoToday } from "@/features/map/domain/map";
import { TransferForm } from "@/features/transfers/components/transfer-form";
import { registerTransfer } from "@/features/transfers/transfer-action";
import { transactionsGateway } from "@/features/transactions/data/transactions-gateway";
import { withAccessToken } from "@/lib/auth/session";

import { CurrencyCatalog } from "@/lib/money/currency";

import { getMessages } from "@/lib/i18n/server";
/** "Transferir" entre cuentas de la misma moneda (spec 002, RF-7 y RF-16). */
export default async function TransferPage() {
  const i18n = await getMessages();
  const t = i18n.transfer;
  const accounts = await withAccessToken(async (token) => {
    const [accounts, currencies, preferences] = await Promise.all([
      transactionsGateway().accounts(token),
      mapGateway().currencies(token),
      mapGateway()
        .preferences(token)
        .catch(() => null),
    ]);
    const hiddenAmounts = await amountsHidden(preferences);
    const catalog = new CurrencyCatalog(currencies);
    return accounts
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
      }));
  });

  return (
    <>
      <header>
        <h1 className="text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">{t.title}</h1>
      </header>
      <GlassCard className="max-w-2xl">
        <TransferForm
          action={registerTransfer}
          accounts={accounts}
          today={isoToday()}
          idempotencyKey={randomUUID()}
        />
      </GlassCard>
    </>
  );
}
