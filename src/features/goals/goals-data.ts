import { amountsHidden } from "@/lib/privacy";
import { withAccessToken } from "@/lib/auth/session";
import { CurrencyCatalog } from "@/lib/money/currency";

import { mapGateway } from "../map/data/map-gateway";
import { transactionsGateway, type Account } from "../transactions/data/transactions-gateway";
import { goalsGateway } from "./data/goals-gateway";

/**
 * Las metas con el catálogo que las etiqueta, el modo privado y las cuentas
 * activas, de donde sale un aporte o adonde vuelve un retiro.
 */
export async function loadGoals() {
  return withAccessToken(async (token) => {
    const [goals, currencies, preferences, accounts] = await Promise.all([
      goalsGateway().goals(token),
      mapGateway().currencies(token),
      mapGateway()
        .preferences(token)
        .catch(() => null),
      transactionsGateway()
        .accounts(token)
        .catch((): Account[] => []),
    ]);
    const hiddenAmounts = await amountsHidden(preferences);
    const catalog = new CurrencyCatalog(currencies);
    return {
      goals,
      catalog,
      hidden: hiddenAmounts,
      accounts: accounts.filter((a) => !a.archived_at),
    };
  });
}

/** Una cuenta para elegir en un aporte o un retiro, ya escrita para mostrar. */
export interface AccountChoice {
  id: string;
  /** El nombre, y "•• 1234" si es una tarjeta (como en la app). */
  name: string;
  /** El saldo, escrito (o oculto en modo privado). */
  detail: string;
  /** El saldo como lo manda la API, para no aportar más de lo que hay. */
  balance: string;
  isDefault: boolean;
}

/** Las monedas en que puede ir una meta: Mis monedas, la principal primero. */
export function goalCurrencies(catalog: CurrencyCatalog) {
  return catalog.mine.map((c) => ({
    code: c.code,
    name: c.name,
    label: catalog.labelOf(c.code),
    decimals: c.decimals,
  }));
}
