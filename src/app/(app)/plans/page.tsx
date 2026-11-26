import { unstable_rethrow } from "next/navigation";

import { ButtonLink } from "@/components/button";
import { GlassCard, ProgressTrack } from "@/components/glass-card";
import { Icon } from "@/components/icon";
import { Toast } from "@/components/toast";
import { PlansView, type PlanCard } from "@/features/billing/components/plans-view";
import { plansGateway } from "@/features/billing/data/plans-gateway";
import { changePlan } from "@/features/billing/plans-actions";
import {
  cellOf,
  comparisonRows,
  featureLabel,
  fullFeatures,
  initialSelection,
  priceIn,
} from "@/features/billing/domain/plans";
import { mapGateway } from "@/features/map/data/map-gateway";
import { withAccessToken } from "@/lib/auth/session";

import { CurrencyCatalog } from "@/lib/money/currency";
import { formatMoney, formatNumber } from "@/lib/money/money";

import { getMessages } from "@/lib/i18n/server";
/**
 * Planes (spec 011 del back; mockup "Web-Planes"; MM-171): el plan propio y
 * cuánto lleva usado, los límites ya alcanzados y los planes lado a lado.
 * Nombres, precios y límites vienen de la API; la web no los escribe.
 */
export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ changed?: string }>;
}) {
  const i18n = await getMessages();
  const t = i18n.plans;
  const { changed } = await searchParams;
  let data: Awaited<ReturnType<typeof load>> | null = null;
  try {
    data = await load();
  } catch (error) {
    unstable_rethrow(error);
  }

  return (
    <>
      {changed && <Toast>{t.changed(changed)}</Toast>}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted text-[13px] font-semibold">{t.eyebrow}</p>
          <h1 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
            {t.heading}
          </h1>
          <p className="text-muted mt-1 text-sm font-medium">{t.subtitle}</p>
        </div>
        <ButtonLink href="/settings" variant="secondary" size="md">
          <Icon name="back" className="size-4" />
          {t.back}
        </ButtonLink>
      </header>
      {!data ? (
        <GlassCard role="alert">
          <h2 className="text-lg font-extrabold">{t.error}</h2>
          <ButtonLink href="/plans" size="md" className="mt-4">
            {t.retry}
          </ButtonLink>
        </GlassCard>
      ) : (
        <>
          <GlassCard data-testid="plans-mine">
            <h2 className="text-base font-extrabold">{t.yourPlan(data.mine.name)}</h2>
            {t.status[data.mine.status] && (
              <p className="text-muted mt-1 text-sm font-semibold">{t.status[data.mine.status]}</p>
            )}
            <ul className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
              {data.mine.features.map((f) => {
                if (f.limit === null || f.used === null) return null;
                const label = featureLabel(f.key, f.description, t.features);
                const full = f.used >= f.limit;
                return (
                  <li key={f.key} className="flex flex-col gap-1.5">
                    <span className="flex items-center justify-between gap-2 text-[13px] font-bold">
                      <span className="text-ink-2">{label}</span>
                      <span className={full ? "text-coral-text" : "text-muted"}>
                        {t.usage(f.used, f.limit)}
                      </span>
                    </span>
                    <span className="flex">
                      <ProgressTrack
                        percent={(100 * f.used) / Math.max(1, f.limit)}
                        tone={full ? "coral" : "primary"}
                        label={t.usageLabel(label, f.used, f.limit)}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          </GlassCard>
          {data.full.length > 0 && (
            <p
              data-testid="plans-limit-reached"
              className="bg-primary-soft text-primary-text flex items-center gap-2.5 rounded-[20px] px-4 py-3 text-sm font-bold"
            >
              <Icon name="lock" className="size-[18px]" />
              {t.limitReached(
                data.full
                  .map((f) => featureLabel(f.key, f.description, t.features).toLowerCase())
                  .join(", "),
              )}
            </p>
          )}
          <PlansView
            plans={data.cards}
            rows={data.rows}
            current={data.mine.code}
            initial={data.initial}
            action={changePlan}
          />
          <p className="text-muted mx-auto max-w-xl text-center text-[13px] font-medium">
            {t.footer}
          </p>
        </>
      )}
    </>
  );
}

async function load() {
  const labels = (await getMessages()).plans.features;
  return withAccessToken(async (token) => {
    const gateway = plansGateway();
    const [plans, mine, currencies] = await Promise.all([
      gateway.plans(token),
      gateway.mine(token),
      mapGateway().currencies(token),
    ]);
    const catalog = new CurrencyCatalog(currencies);
    const currency = catalog.main?.code ?? "BOB";
    const rows = comparisonRows(plans, labels);
    const cards: PlanCard[] = plans.map((plan) => {
      const price = plan.tier === 0 ? undefined : priceIn(plan, currency);
      return {
        code: plan.code,
        name: plan.name,
        description: plan.description,
        isFree: plan.tier === 0,
        tier: plan.tier,
        monthly: price ? formatMoney(price.monthly, price.currency, catalog) : null,
        yearly: price?.yearly ? formatMoney(price.yearly, price.currency, catalog) : null,
        savingPct: price?.yearly_saving_pct ? formatNumber(price.yearly_saving_pct, 2) : null,
        cells: Object.fromEntries(rows.map((r) => [r.key, cellOf(plan, r.key)])),
      };
    });
    return { mine, cards, rows, full: fullFeatures(mine), initial: initialSelection(plans, mine) };
  });
}
