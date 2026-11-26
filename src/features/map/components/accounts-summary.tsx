import Decimal from "decimal.js";

import { formatMoney } from "@/lib/money/money";
import { useServerMessages } from "@/lib/i18n/server";

import type { Account } from "../../transactions/data/transactions-gateway";
import type { MoneyView } from "./map-cards";
import { AccountsTiles, type AccountKind } from "./accounts-tiles";

/** Lo que muestra una tarjeta: el banco, o las primeras letras del nombre (como en la app). */
function badge(account: Account): string {
  const letters = account.name.replace(/[^A-Za-zÁÉÍÓÚÑáéíóúñ]/g, "");
  return letters.slice(0, 3).toUpperCase();
}

/**
 * "Efectivo" y "Tarjeta" lado a lado, como en la app: cada una con su cuenta
 * principal (la predeterminada, si no la primera); con más de una, un toque
 * despliega las otras de ese tipo. Solo la moneda elegida.
 */
export function AccountsSummary({
  accounts,
  currency,
  view,
}: {
  accounts: Account[];
  currency: string;
  view: MoneyView;
}) {
  const i18n = useServerMessages();
  const t = i18n.map;
  const name = view.catalog.get(currency)?.name ?? currency;
  const money = (amount: string) =>
    formatMoney(amount, currency, view.catalog, { hidden: view.hidden });
  const kinds: AccountKind[] = [false, true].flatMap((isCard) => {
    const list = accounts.filter((a) => (a.type === "card") === isCard);
    if (list.length === 0) return [];
    const main = list.find((a) => a.is_default) ?? list[0]!;
    return [
      {
        isCard,
        title: isCard ? t.card : t.cash,
        balance: money(main.current_balance),
        zero: new Decimal(main.current_balance).isZero(),
        subtitle: isCard ? t.cardShort(badge(main), main.last4 ?? "") : main.name,
        more: list.length > 1 ? t.accountsMore(list.length - 1) : null,
        others: list
          .filter((a) => a !== main)
          .map((a) => ({
            id: a.id,
            name: a.name,
            badge: badge(a),
            detail: isCard ? t.accountCard(a.last4 ?? "", currency) : t.accountCash(currency, name),
            balance: formatMoney(a.current_balance, currency, view.catalog, {
              hidden: view.hidden,
              keepZeroDecimals: true,
            }),
          })),
      },
    ];
  });
  if (kinds.length === 0) return null;
  return <AccountsTiles kinds={kinds} label={t.accounts} seeAll={t.accountsSeeAll} />;
}
