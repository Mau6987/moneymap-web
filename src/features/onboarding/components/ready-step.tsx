import { unstable_rethrow } from "next/navigation";

import { ButtonLink } from "@/components/button";
import { Ring, ringText } from "@/features/map/components/map-cards";
import { ringShares } from "@/features/map/domain/map";
import { cx } from "@/lib/cx";
import { longDate } from "@/lib/dates";
import { onboardingErrorText } from "@/lib/i18n/onboarding-messages";
import { errorCode } from "@/lib/api/errors";
import { withAccessToken } from "@/lib/auth/session";
import { CurrencyCatalog } from "@/lib/money/currency";
import { formatMoney } from "@/lib/money/money";

import {
  onboardingGateway,
  type Currency,
  type OnboardingStatus,
  type OnboardingSummary,
} from "../data/onboarding-gateway";
import { StepHeading } from "./onboarding-shell";

import { getMessages } from "@/lib/i18n/server";
/**
 * RF-7 y RF-8: "Tu MoneyMap está listo" con Safe to Spend, los ingresos, lo
 * comprometido y el saldo del periodo, como los calcula la API al cerrar el
 * onboarding (`POST /v1/onboarding/complete` es idempotente). RF-9: si faltó
 * el ingreso o los gastos, se dice que se agregan después.
 */
export async function ReadyStep({
  currencies,
  status,
}: {
  currencies: Currency[];
  status: OnboardingStatus;
}) {
  const i18n = await getMessages();
  const t = i18n.onboarding.ready;
  const onboardingMessages = i18n.onboarding;
  let summary: OnboardingSummary | null = null;
  let error: string | null = null;
  try {
    summary = await withAccessToken((token) => onboardingGateway().complete(token));
  } catch (e) {
    unstable_rethrow(e);
    error = errorCode(e);
  }

  if (!summary) {
    return (
      <div className="flex flex-col gap-4">
        <StepHeading title={t.title} />
        <p
          role="alert"
          className="bg-coral-soft text-coral-text rounded-2xl px-4 py-3 text-sm font-bold"
        >
          {onboardingErrorText(error ?? "unknown_error", i18n.locale)}
        </p>
        <div>
          <ButtonLink href="/onboarding" size="md">
            {onboardingMessages.retry}
          </ButtonLink>
        </div>
      </div>
    );
  }

  const catalog = new CurrencyCatalog(currencies);
  const money = (amount: string, sign?: "+" | "−") =>
    formatMoney(amount, summary.currency, catalog, { sign });
  // Lo libre en verde y lo comprometido en rojo, como el anillo del Map.
  const parts = ringShares({
    balance: summary.balance,
    spent: "0",
    payables: summary.committed,
    free: summary.safe_to_spend,
  });
  const pending = status.income_rules === 0 || status.expense_rules === 0;

  return (
    <div className="flex flex-col gap-5">
      <StepHeading
        title={t.title}
        subtitle={t.subtitle(
          longDate(summary.period_starts_on, i18n.locale),
          longDate(summary.period_ends_on, i18n.locale),
        )}
      />
      {/* BUG-048: la misma tarjeta de Safe to Spend que el Map, con su anillo. */}
      <section
        className="glass rounded-[26px] p-5"
        aria-label={t.safeToSpend}
        data-testid="onboarding-safe-to-spend"
      >
        <p className="text-muted text-xs font-extrabold tracking-wide uppercase">{t.safeToSpend}</p>
        <div className="mt-3 flex items-center gap-5 max-sm:flex-col">
          <div className="relative grid place-items-center">
            <Ring
              parts={[
                {
                  share: parts.free,
                  stroke: "stroke-[var(--mm-green)]",
                  testId: "onboarding-ring-free",
                },
                {
                  share: parts.payables,
                  stroke: "stroke-[var(--mm-coral)]",
                  testId: "onboarding-ring-payables",
                },
              ]}
            />
            <span className="absolute max-w-[104px] text-center">
              <span
                className={cx(
                  "block font-extrabold tabular-nums",
                  ringText(money(summary.balance)),
                  summary.balance.startsWith("-") && "text-coral-text",
                )}
                data-testid="onboarding-total"
              >
                {money(summary.balance)}
              </span>
              <span className="text-muted text-xs font-semibold">{i18n.map.total}</span>
            </span>
          </div>
          <dl className="grid w-full min-w-0 flex-1 grid-cols-3 gap-3 text-sm max-sm:grid-cols-1 max-sm:gap-2">
            <div>
              <dt className="text-muted text-xs font-semibold">{t.income}</dt>
              <dd className="text-green-text font-extrabold">{money(summary.income, "+")}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs font-semibold">{t.committed}</dt>
              <dd className="text-coral-text font-extrabold">{money(summary.committed, "−")}</dd>
            </div>
            <div>
              <dt className="text-muted text-xs font-semibold">{t.safeToSpend}</dt>
              <dd
                className={cx(
                  "font-extrabold",
                  summary.safe_to_spend.startsWith("-") && "text-coral-text",
                )}
                data-testid="onboarding-safe-amount"
              >
                {money(summary.safe_to_spend)}
              </dd>
            </div>
          </dl>
        </div>
        <p className="text-muted mt-3 text-xs font-semibold">{t.safeToSpendDetail}</p>
      </section>
      {pending && <p className="text-muted text-sm">{t.pending}</p>}
      <div className="flex justify-end">
        <ButtonLink href="/map" size="md">
          {t.goToMap}
        </ButtonLink>
      </div>
    </div>
  );
}
