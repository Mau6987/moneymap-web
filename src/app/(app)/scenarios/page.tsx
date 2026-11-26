import { amountsHidden } from "@/lib/privacy";
import Link from "next/link";

import { mapGateway } from "@/features/map/data/map-gateway";
import { AffordPanel } from "@/features/scenarios/components/afford-panel";
import { WhatIfSimulator } from "@/features/scenarios/components/what-if-simulator";
import { scenariosGateway, type PeriodType } from "@/features/scenarios/data/scenarios-gateway";
import { checkAffordability, loadWhatIfBase } from "@/features/scenarios/scenarios-actions";
import { settingsGateway } from "@/features/settings/data/settings-gateway";
import { transactionsGateway } from "@/features/transactions/data/transactions-gateway";
import { errorCode } from "@/lib/api/errors";
import { asLimit, isFull, myPlanFeatures } from "@/features/billing/plan-limits";
import { withAccessToken } from "@/lib/auth/session";
import { cx } from "@/lib/cx";

import { getMessages } from "@/lib/i18n/server";
const PERIODS: readonly string[] = ["weekly", "semi_monthly", "monthly"];
const periodOf = (type: string | undefined): PeriodType =>
  type && PERIODS.includes(type) ? (type as PeriodType) : "monthly";

/**
 * Escenarios: Can I Afford It? (spec 005) y el simulador de What If? (spec 009
 * del back), en pestañas. Nada se guarda: al salir no queda nada (spec 005, RF-16).
 */
export default async function ScenariosPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const i18n = await getMessages();
  const t = i18n.scenarios;
  const { tab } = await searchParams;
  const current = tab === "what-if" ? "what-if" : "afford";
  // MM-188: las consultas de Can I Afford It? del mes siguen el plan.
  // A la vez que los datos: antes el plan y los datos iban uno detrás del otro.
  const features = myPlanFeatures();
  const load = withAccessToken(async (token) => {
    const map = mapGateway();
    if (current === "afford") {
      const [currencies, categories, preferences, accounts] = await Promise.all([
        map.currencies(token),
        map.categories(token).catch(() => []),
        map.preferences(token).catch(() => null),
        transactionsGateway()
          .accounts(token)
          .catch(() => []),
      ]);
      const hiddenAmounts = await amountsHidden(preferences);
      return {
        currencies,
        // Las monedas en las que tiene cuentas: solo esas se ofrecen.
        accountCurrencies: [
          ...new Set(accounts.filter((a) => a.archived_at === null).map((a) => a.currency)),
        ],
        categories: categories
          .filter((c) => c.type === "expense")
          .map(({ id, name }) => ({ id, name })),
        hidden: hiddenAmounts,
        whatIf: null,
      };
    }
    // What If?: el periodo por defecto es el que configuró el usuario.
    const [currencies, preferences, settings, accounts, categories, balances] = await Promise.all([
      map.currencies(token),
      map.preferences(token).catch(() => null),
      settingsGateway()
        .money(token)
        .catch(() => null),
      transactionsGateway()
        .accounts(token)
        .catch(() => []),
      map.categories(token).catch(() => []),
      map.balances(token).catch(() => []),
    ]);
    const hiddenAmounts = await amountsHidden(preferences);
    const period = periodOf(settings?.period_type);
    const currency =
      currencies.find((c) => c.is_mine && c.is_main_currency)?.code ??
      currencies.find((c) => c.is_mine)?.code ??
      "";
    const initial = currency
      ? await scenariosGateway()
          .baseline(token, { currency, period_type: period, account_id: null })
          .then((base) => ({ base, error: undefined }))
          .catch((error: unknown) => ({ base: null, error: errorCode(error) }))
      : { base: null, error: "validation_error" };
    return {
      currencies,
      categories: [],
      accountCurrencies: [],
      hidden: hiddenAmounts,
      whatIf: {
        period,
        initial,
        categories: categories.map(({ id, name, icon, color }) => ({ id, name, icon, color })),
        accounts: accounts
          .filter((a) => a.archived_at === null)
          .map(({ id, name, type, currency, last4, current_balance }) => ({
            id,
            name,
            type,
            currency,
            last4,
            balance: current_balance,
          })),
        balances: Object.fromEntries(balances.map((b) => [b.currency, b.total])),
      },
    };
  });
  const [plan, data] = await Promise.all([features, load]);
  const checks = plan?.get("planning.affordability_checks") ?? null;

  return (
    <>
      <header>
        <h1 className="text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">{t.title}</h1>
      </header>
      <nav aria-label={t.tabs} className="flex gap-2">
        {(
          [
            ["afford", t.afford],
            ["what-if", t.whatIf],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={`/scenarios?tab=${key}`}
            aria-current={current === key ? "page" : undefined}
            className={cx(
              "focus-ring inline-flex h-10 items-center rounded-full px-4 text-sm font-bold",
              current === key
                ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
                : "glass text-ink-2",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>
      {current === "afford" ? (
        <AffordPanel
          action={checkAffordability}
          currencies={data.currencies}
          accountCurrencies={data.accountCurrencies}
          categories={data.categories}
          hidden={data.hidden}
          checks={
            checks && checks.limit !== null && checks.used !== null
              ? { limit: asLimit(checks), full: isFull(checks) }
              : null
          }
        />
      ) : (
        data.whatIf && (
          <WhatIfSimulator
            load={loadWhatIfBase}
            initial={data.whatIf.initial.base}
            initialError={data.whatIf.initial.error}
            currencies={data.currencies}
            accounts={data.whatIf.accounts}
            categories={data.whatIf.categories}
            balances={data.whatIf.balances}
            defaultPeriod={data.whatIf.period}
            hidden={data.hidden}
          />
        )
      )}
    </>
  );
}
