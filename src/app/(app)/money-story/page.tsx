import { amountsHidden } from "@/lib/privacy";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { ButtonLink } from "@/components/button";
import { GlassCard } from "@/components/glass-card";
import { Icon } from "@/components/icon";
import { mapGateway } from "@/features/map/data/map-gateway";
import { isoToday } from "@/features/map/domain/map";
import { isPeriod, shiftPeriod } from "@/features/money-flow/domain/money-flow";
import {
  lastClosedPeriod,
  moneyStoryGateway,
} from "@/features/money-story/data/money-story-gateway";
import { StoryBody } from "@/features/money-story/components/story-body";
import { withAccessToken } from "@/lib/auth/session";
import { cx } from "@/lib/cx";
import { monthName } from "@/lib/dates";

import { CurrencyCatalog } from "@/lib/money/currency";

import { getMessages } from "@/lib/i18n/server";
/**
 * Money Story (spec 006; mockups "Web-MoneyStory" y "Web-Resumen-Mes"): cómo
 * le fue al usuario en un mes cerrado, una historia por moneda y nunca
 * sumadas (RF-6). Informa sin juzgar (RF-5). Sin `period`, el último cerrado.
 */
export default async function MoneyStoryPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string; period?: string }>;
}) {
  const i18n = await getMessages();
  const t = i18n.moneyStory;
  const params = await searchParams;
  const latest = lastClosedPeriod(isoToday());
  const requested = isPeriod(params.period) && params.period <= latest ? params.period : undefined;

  let data: Awaited<ReturnType<typeof load>> | null = null;
  try {
    data = await load(requested);
  } catch (error) {
    unstable_rethrow(error);
  }

  const period = data?.month.period ?? requested ?? latest;
  const story =
    data?.month.items.find((s) => s.currency === params.currency) ?? data?.month.items[0];
  const href = (changes: Record<string, string>) => {
    const query = new URLSearchParams({
      ...(story ? { currency: story.currency } : {}),
      period,
      ...changes,
    });
    return `/money-story?${query}`;
  };
  // Todavía no cerró ningún mes con movimientos.
  const noStoryYet = data !== null && data.month.period === null;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted text-[13px] font-semibold">{t.title}</p>
          <h1 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
            {t.heading}
          </h1>
        </div>
        {!noStoryYet && (
          <nav aria-label={t.title} className="flex items-center gap-2">
            <ButtonLink
              href={href({ period: shiftPeriod(period, -1) })}
              variant="secondary"
              size="md"
              aria-label={t.previous}
            >
              <Icon name="back" className="size-4" />
            </ButtonLink>
            <span data-testid="story-month" className="min-w-28 text-center text-sm font-extrabold">
              {monthName(`${period}-01`, i18n.locale)} {period.slice(0, 4)}
            </span>
            <ButtonLink
              href={href({ period: shiftPeriod(period, 1) })}
              variant="secondary"
              size="md"
              aria-label={t.next}
              disabled={period >= latest}
            >
              <Icon name="chevron" className="size-4" />
            </ButtonLink>
          </nav>
        )}
      </header>
      {!data ? (
        <GlassCard role="alert">
          <h2 className="text-lg font-extrabold">{t.error}</h2>
          <ButtonLink href={href({})} size="md" className="mt-4">
            {t.retry}
          </ButtonLink>
        </GlassCard>
      ) : !story ? (
        <GlassCard data-testid="story-empty">
          <p className="text-center font-bold">{noStoryYet ? t.empty : t.emptyMonth}</p>
        </GlassCard>
      ) : (
        <>
          {data.month.items.length > 1 && (
            <nav aria-label={i18n.map.currencyTabs} className="flex flex-wrap gap-2">
              {data.month.items.map(({ currency }) => (
                <Link
                  key={currency}
                  href={href({ currency })}
                  aria-current={currency === story.currency ? "page" : undefined}
                  className={cx(
                    "focus-ring inline-flex h-10 items-center rounded-full px-4 text-sm font-bold",
                    currency === story.currency
                      ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
                      : "glass text-ink-2",
                  )}
                >
                  {currency}
                </Link>
              ))}
            </nav>
          )}
          <StoryBody story={story} catalog={data.catalog} hidden={data.hidden} />
        </>
      )}
    </>
  );
}

async function load(period: string | undefined) {
  return withAccessToken(async (token) => {
    const map = mapGateway();
    const [currencies, preferences, month] = await Promise.all([
      map.currencies(token),
      map.preferences(token).catch(() => null),
      moneyStoryGateway().month(token, period),
    ]);
    const hiddenAmounts = await amountsHidden(preferences);
    const catalog = new CurrencyCatalog(currencies);
    // RF-6: la moneda principal primero.
    const order = catalog.order(month.items.map((s) => s.currency));
    const items = [...month.items].sort(
      (a, b) => order.indexOf(a.currency) - order.indexOf(b.currency),
    );
    return { catalog, hidden: hiddenAmounts, month: { ...month, items } };
  });
}
