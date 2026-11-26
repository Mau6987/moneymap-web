import { amountsHidden } from "@/lib/privacy";
import Decimal from "decimal.js";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { ButtonLink } from "@/components/button";
import { GlassCard, ProgressTrack } from "@/components/glass-card";
import { Icon } from "@/components/icon";
import { mapGateway } from "@/features/map/data/map-gateway";
import { isoToday } from "@/features/map/domain/map";
import { FlowDonut } from "@/features/money-flow/components/flow-donut";
import { moneyFlowGateway, type FlowGroup } from "@/features/money-flow/data/money-flow-gateway";
import {
  RULE,
  isPeriod,
  percentOf,
  periodOf,
  shiftPeriod,
} from "@/features/money-flow/domain/money-flow";
import { withAccessToken } from "@/lib/auth/session";
import { cx } from "@/lib/cx";
import { monthName } from "@/lib/dates";

import { CurrencyCatalog } from "@/lib/money/currency";
import { formatMoney, shareOf } from "@/lib/money/money";

import { getMessages, useServerMessages } from "@/lib/i18n/server";
type Node = "needs" | "lifestyle" | "goals" | "available";

const NODES: { key: Node; color: string }[] = [
  { key: "needs", color: "var(--mm-coral)" },
  { key: "lifestyle", color: "var(--mm-amber)" },
  { key: "goals", color: "var(--mm-primary)" },
  { key: "available", color: "var(--mm-green)" },
];

const isNode = (value: string | undefined): value is Node => NODES.some((n) => n.key === value);

/**
 * Money Flow (spec 004, RF-6 a RF-13; mockup "Web-MoneyFlow"): a dónde fue el
 * ingreso del mes de una moneda, por grupo y por categoría. Los cuatro grupos
 * suman el ingreso (RF-7) y los da la API; la web no suma nada.
 */
export default async function MoneyFlowPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string; period?: string; group?: string }>;
}) {
  const i18n = await getMessages();
  const t = i18n.moneyFlow;
  const params = await searchParams;
  const period = isPeriod(params.period) ? params.period : periodOf(isoToday());
  const selected: Node = isNode(params.group) ? params.group : "needs";

  let data: Awaited<ReturnType<typeof load>> | null = null;
  try {
    data = await load(params.currency, period, selected);
  } catch (error) {
    unstable_rethrow(error);
  }

  const href = (changes: Record<string, string>) => {
    const query = new URLSearchParams({
      ...(data?.currency ? { currency: data.currency } : {}),
      period,
      group: selected,
      ...changes,
    });
    return `/money-flow?${query}`;
  };

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted text-[13px] font-semibold">{t.title}</p>
          <h1 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
            {t.heading}
          </h1>
        </div>
        <nav aria-label={t.title} className="flex items-center gap-2">
          <ButtonLink
            href={href({ period: shiftPeriod(period, -1) })}
            variant="secondary"
            size="md"
            aria-label={t.previous}
          >
            <Icon name="back" className="size-4" />
          </ButtonLink>
          <span className="min-w-28 text-center text-sm font-extrabold">
            {monthName(`${period}-01`, i18n.locale)} {period.slice(0, 4)}
          </span>
          <ButtonLink
            href={href({ period: shiftPeriod(period, 1) })}
            variant="secondary"
            size="md"
            aria-label={t.next}
            disabled={period >= periodOf(isoToday())}
          >
            <Icon name="chevron" className="size-4" />
          </ButtonLink>
        </nav>
      </header>
      {!data ? (
        <GlassCard role="alert">
          <h2 className="text-lg font-extrabold">{t.error}</h2>
          <ButtonLink href={href({})} size="md" className="mt-4">
            {t.retry}
          </ButtonLink>
        </GlassCard>
      ) : !data.flow ? (
        <GlassCard>
          <p className="text-muted text-sm">{t.noAccounts}</p>
        </GlassCard>
      ) : (
        <FlowBody data={data} selected={selected} href={href} />
      )}
    </>
  );
}

function FlowBody({
  data,
  selected,
  href,
}: {
  data: NonNullable<Awaited<ReturnType<typeof load>>>;
  selected: Node;
  href: (changes: Record<string, string>) => string;
}) {
  const i18n = useServerMessages();
  const t = i18n.moneyFlow;
  const flow = data.flow!;
  const { nodes, currency } = flow;
  const money = (amount: string) =>
    formatMoney(amount, currency, data.catalog, { hidden: data.hidden });
  const label = t.groups[selected];
  const noIncome = new Decimal(nodes.income).lte(0);

  return (
    <>
      {data.codes.length > 1 && (
        <nav aria-label={i18n.map.currencyTabs} className="flex flex-wrap gap-2">
          {data.codes.map((code) => (
            <Link
              key={code}
              href={href({ currency: code })}
              aria-current={code === currency ? "page" : undefined}
              className={cx(
                "focus-ring inline-flex h-10 items-center rounded-full px-4 text-sm font-bold",
                code === currency
                  ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
                  : "glass text-ink-2",
              )}
            >
              {code}
            </Link>
          ))}
        </nav>
      )}
      <div className="grid items-start gap-4 xl:grid-cols-[1.6fr_1fr]">
        <GlassCard>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-extrabold">{t.title}</h2>
            <span className="text-muted text-xs font-semibold">
              {t.monthIncome(monthName(flow.period_starts_on, i18n.locale), money(nodes.income))}
            </span>
          </div>
          {noIncome ? (
            <p className="text-muted mt-4 text-sm">{t.noIncome}</p>
          ) : (
            <div className="mt-4 flex flex-wrap items-center gap-6">
              <FlowDonut
                label={NODES.map((n) => `${t.groups[n.key]} ${money(nodes[n.key])}`).join(", ")}
                segments={NODES.map((n) => ({
                  key: n.key,
                  color: n.color,
                  share: shareOf(nodes[n.key], nodes.income),
                }))}
              >
                <div className="text-muted text-xs font-bold">{label}</div>
                <div className="text-xl font-extrabold tabular-nums">{money(nodes[selected])}</div>
                <div className="text-muted text-xs font-semibold">
                  {t.ofIncome(percentOf(nodes[selected], nodes.income))}
                </div>
              </FlowDonut>
              <ul className="flex min-w-[14rem] flex-1 flex-col gap-1.5">
                {NODES.map((n) => (
                  <li key={n.key}>
                    <Link
                      href={href({ group: n.key })}
                      aria-current={n.key === selected ? "true" : undefined}
                      data-testid={`flow-${n.key}`}
                      className={cx(
                        "focus-ring grid grid-cols-[auto_1fr_auto_auto] items-center gap-3 rounded-[14px] px-3 py-2.5 text-sm",
                        n.key === selected && "bg-well",
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className="size-3 rounded-full"
                        style={{ background: n.color }}
                      />
                      <span className="font-bold">{t.groups[n.key]}</span>
                      <span className="font-extrabold tabular-nums">{money(nodes[n.key])}</span>
                      <span className="text-muted w-12 text-right text-xs font-semibold">
                        {percentOf(nodes[n.key], nodes.income)} %
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <section aria-labelledby="flow-categories" className="mt-6">
            <h3 id="flow-categories" className="text-[15px] font-extrabold">
              {t.byCategory(label)}
            </h3>
            {selected === "goals" || selected === "available" ? (
              <p className="text-muted mt-2 text-sm">
                {selected === "goals" ? t.goalsNote : t.availableNote}{" "}
                <Link
                  href={selected === "goals" ? "/goals" : `/safe-to-spend?currency=${currency}`}
                  className="focus-ring text-primary-text font-bold"
                >
                  {selected === "goals" ? t.goalsLink : t.availableLink}
                </Link>
              </p>
            ) : data.categories && data.categories.items.length > 0 ? (
              <ul className="mt-3 flex flex-col gap-2.5">
                {data.categories.items.map((c) => (
                  <li
                    key={c.category_id ?? c.name}
                    className="grid grid-cols-[minmax(0,9rem)_minmax(3rem,1fr)_auto_auto] items-center gap-3 text-sm"
                  >
                    <span className="truncate font-semibold">{c.name ?? t.deleted}</span>
                    <ProgressTrack
                      percent={shareOf(c.amount, nodes[selected]) * 100}
                      tone={selected === "needs" ? "coral" : "amber"}
                      label={c.name ?? t.deleted}
                    />
                    <span className="font-extrabold tabular-nums">{money(c.amount)}</span>
                    <span className="text-muted w-12 text-right text-xs font-semibold">
                      {percentOf(c.amount, nodes.income)} %
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted mt-2 text-sm">{t.noCategories}</p>
            )}
          </section>
        </GlassCard>
        <GlassCard aria-labelledby="flow-rule">
          <h2 id="flow-rule" className="text-[15px] font-extrabold">
            {t.rule}
          </h2>
          <p className="text-muted mt-1 text-xs">{t.ruleNote}</p>
          <ul className="mt-4 flex flex-col gap-4">
            {(
              [
                ["needs", t.groups.needs, RULE.needs, "coral"],
                ["lifestyle", t.groups.lifestyle, RULE.lifestyle, "amber"],
                ["goals", t.ruleSavings, RULE.goals, "primary"],
              ] as const
            ).map(([key, name, reference, tone]) => {
              const percent = percentOf(nodes[key], nodes.income);
              return (
                <li key={key} className="text-sm">
                  <div className="flex justify-between font-semibold">
                    <span>{name}</span>
                    <span className="font-extrabold">{t.ruleRow(percent, reference)}</span>
                  </div>
                  <div className="mt-1.5 flex">
                    <ProgressTrack
                      percent={percent}
                      tone={tone}
                      label={`${name}: ${t.ruleRow(percent, reference)}`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </GlassCard>
      </div>
    </>
  );
}

async function load(requested: string | undefined, period: string, group: Node) {
  return withAccessToken(async (token) => {
    const map = mapGateway();
    const [currencies, balances, preferences] = await Promise.all([
      map.currencies(token),
      map.balances(token),
      map.preferences(token).catch(() => null),
    ]);
    const hiddenAmounts = await amountsHidden(preferences);
    const catalog = new CurrencyCatalog(currencies);
    const withAccounts = balances.filter((b) => b.accounts > 0);
    const codes = catalog.order(withAccounts.map((b) => b.currency));
    const main = withAccounts.find((b) => b.is_main_currency)?.currency ?? codes[0];
    const currency = requested && codes.includes(requested) ? requested : main;
    const base = { catalog, codes, currency, hidden: hiddenAmounts };
    if (!currency) return { ...base, flow: null, categories: null };

    const gateway = moneyFlowGateway();
    const withCategories = group === "needs" || group === "lifestyle";
    const [flow, categories] = await Promise.all([
      gateway.flow(token, currency, period),
      withCategories
        ? gateway.categories(token, currency, group as FlowGroup, period).catch(() => null)
        : Promise.resolve(null),
    ]);
    return { ...base, flow, categories };
  });
}
