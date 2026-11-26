import { redirect, unstable_rethrow } from "next/navigation";

import { Button, ButtonLink } from "@/components/button";
import { Icon } from "@/components/icon";
import { Toast } from "@/components/toast";
import { currentProfile } from "@/features/auth/profile";
import { AccountsSummary } from "@/features/map/components/accounts-summary";
import { CurrencyTabs } from "@/features/map/components/currency-tabs";
import type { MoneyView } from "@/features/map/components/map-cards";
import {
  BudgetsCard,
  ForecastCard,
  MoneyFlowCard,
  MoneyStoryCard,
  SafeToSpendCard,
} from "@/features/map/components/map-cards";
import {
  AllCurrencies,
  DuePaymentsCard,
  EmptyMap,
  MapError,
  MonthChip,
  NoAccounts,
  PastMonth,
  SetupCard,
} from "@/features/map/components/map-states";
import { hasNoMovements, isEmptyMap, isoToday, pastMonth } from "@/features/map/domain/map";
import {
  loadMap,
  loadPastMonth,
  type CurrencyMap,
  type MapData,
  type PastMonthData,
} from "@/features/map/map-data";
import { notificationsGateway } from "@/features/notifications/data/notifications-gateway";
import { toggleAmounts } from "@/features/map/map-actions";
import { onboardingGateway } from "@/features/onboarding/data/onboarding-gateway";
import { withAccessToken } from "@/lib/auth/session";
import { recurringErrorText } from "@/lib/i18n/recurring-messages";

import { getMessages } from "@/lib/i18n/server";
/**
 * El Map (specs 003 y 004; mockups "Web-Map" y "Web-Map-Vacio"). BUG-040:
 * muestra lo mismo que el de la app, en el mismo orden, y el chip del mes
 * abre los últimos 12 meses.
 */
export default async function MapPage({
  searchParams,
}: {
  searchParams: Promise<{ currency?: string; saved?: string; error?: string; month?: string }>;
}) {
  const i18n = await getMessages();
  const t = i18n.map;
  const messages = i18n.common;
  const { currency, saved, error, month: monthParam } = await searchParams;
  const today = isoToday();
  const month = pastMonth(monthParam, today);
  // Todo se pide a la vez: cada viaje a la API suma medio segundo, y antes el
  // onboarding, el perfil y el Map iban uno detrás del otro.
  const past = month
    ? loadPastMonth(currency, month).then(
        (data): PastMonthData | null => data,
        (error: unknown) => {
          unstable_rethrow(error);
          return null;
        },
      )
    : null;
  const map = (month ? Promise.resolve(null) : loadMap(currency)).then(
    (data): MapData | null => data,
    (error: unknown) => {
      // La sesión vencida redirige: eso no es un error del Map.
      unstable_rethrow(error);
      return null;
    },
  );
  // Solo el conteo: si falla, la campana va sin número.
  const unread = withAccessToken((token) => notificationsGateway().inbox(token, { limit: 1 })).then(
    (inbox) => inbox.unread,
    (error: unknown) => {
      unstable_rethrow(error);
      return 0;
    },
  );
  const [done, profile] = await Promise.all([onboardingDone(), currentProfile()]);
  // Spec 007, RF-1 y RF-10: sin terminar el onboarding, se retoma ahí.
  if (!done) redirect("/onboarding");
  const [data, pastData, unreadCount] = await Promise.all([map, past, unread]);
  const hasAccounts = (data?.codes.length ?? pastData?.codes.length ?? 0) > 0;
  const shownCurrency = data?.selected ?? pastData?.selected;
  const hiddenNow = data?.hidden ?? pastData?.hidden ?? false;

  return (
    <>
      {saved === "paid" && <Toast>{i18n.payables.paid}</Toast>}
      {saved === "skipped" && <Toast>{i18n.payables.skipped}</Toast>}
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
            {messages.map.greeting(profile.first_name)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {(hasAccounts || month) && (
            <MonthChip
              today={today}
              shown={month}
              currency={currency === shownCurrency ? currency : undefined}
            />
          )}
          {(data?.privateMode ?? pastData?.privateMode) && (
            <form action={toggleAmounts}>
              <input type="hidden" name="reveal" value={hiddenNow ? "1" : "0"} />
              <input
                type="hidden"
                name="back"
                value={`/map${currency ? `?currency=${currency}` : ""}`}
              />
              <Button
                type="submit"
                variant="secondary"
                size="md"
                aria-label={hiddenNow ? t.showAmounts : t.hideAmounts}
                title={hiddenNow ? t.showAmounts : t.hideAmounts}
                data-testid="map-eye"
              >
                <Icon name={hiddenNow ? "eye" : "eye-off"} />
              </Button>
            </form>
          )}
          <ButtonLink
            href="/notifications"
            variant="secondary"
            size="md"
            aria-label={unreadCount > 0 ? t.noticesUnread(unreadCount) : t.notices}
            className="relative"
          >
            <Icon name="bell" />
            {unreadCount > 0 && (
              <span
                aria-hidden="true"
                data-testid="map-unread"
                className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#b5422b] px-1 text-[11px] font-extrabold text-white"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </ButtonLink>
        </div>
      </header>
      <nav aria-label={t.quickActions} className="flex flex-wrap gap-2" data-testid="map-quick">
        {/* Registrar ya está en el menú lateral y en el botón del centro del teléfono. */}
        <ButtonLink href="/transfer" variant="secondary" size="md">
          <Icon name="transfer" />
          {i18n.common.nav.transfer}
        </ButtonLink>
        <ButtonLink href="/goals" variant="secondary" size="md">
          <Icon name="goals" />
          {t.quickGoal}
        </ButtonLink>
      </nav>
      {error && (
        <p
          role="alert"
          className="bg-coral-soft text-coral-text rounded-2xl px-4 py-3 text-sm font-bold"
        >
          {recurringErrorText(error, i18n.locale)}
        </p>
      )}
      {month ? (
        <PastMonthBody
          data={pastData}
          month={month}
          retryHref={`/map?month=${month.slice(0, 7)}${currency ? `&currency=${currency}` : ""}`}
        />
      ) : (
        <MapBody
          data={data}
          today={today}
          retryHref={`/map${currency ? `?currency=${currency}` : ""}`}
        />
      )}
    </>
  );
}

/** Un mes pasado: las pestañas de moneda y su resumen (BUG-040). */
function PastMonthBody({
  data,
  month,
  retryHref,
}: {
  data: PastMonthData | null;
  month: string;
  retryHref: string;
}) {
  if (!data?.position) return <MapError retryHref={retryHref} />;
  if (data.codes.length === 0) return <NoAccounts />;
  return (
    <>
      <CurrencyTabs codes={data.codes} selected={data.selected} month={month} />
      <PastMonth
        month={month}
        currency={data.selected}
        position={data.position}
        view={{ catalog: data.catalog, hidden: data.hidden }}
      />
    </>
  );
}

function MapBody({
  data,
  today,
  retryHref,
}: {
  data: MapData | null;
  today: string;
  retryHref: string;
}) {
  if (!data) return <MapError retryHref={retryHref} />;
  if (data.codes.length === 0) return <NoAccounts />;
  const view = { catalog: data.catalog, hidden: data.hidden };

  return (
    <>
      <CurrencyTabs codes={data.codes} selected={data.selected} />
      {data.all && <AllCurrencies blocks={data.all} view={view} />}
      {data.single && <CurrencyBody map={data.single} view={view} today={today} />}
    </>
  );
}

/**
 * Una moneda, como la app: los pagos de hoy arriba; sin movimientos, Safe to
 * Spend (o el Map vacío), las cuentas y "Completa tu mapa"; si no, Safe to
 * Spend, las cuentas, Presupuestos, Forecast, Money Flow y Money Story.
 */
function CurrencyBody({ map, view, today }: { map: CurrencyMap; view: MoneyView; today: string }) {
  const currency = map.safeToSpend.currency;
  const accounts = map.accounts && (
    <AccountsSummary accounts={map.accounts} currency={currency} view={view} />
  );
  const safeToSpend = (
    <SafeToSpendCard block={map} view={view} today={today} isMain={map.balance.is_main_currency} />
  );
  return (
    <>
      <DuePaymentsCard
        rules={map.due ?? []}
        today={today}
        view={view}
        accounts={map.accounts ?? []}
      />
      {hasNoMovements(map.position) ? (
        <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="flex min-w-0 flex-col gap-4">
            {isEmptyMap(map.position) ? (
              <EmptyMap label={view.catalog.labelOf(currency)} />
            ) : (
              safeToSpend
            )}
            {accounts}
          </div>
          {map.setup && <SetupCard setup={map.setup} />}
        </div>
      ) : (
        <>
          <div className="grid items-start gap-4 xl:grid-cols-[1.4fr_1fr]">
            {/* Como en la app: Efectivo y Tarjeta justo debajo de Safe to Spend. */}
            <div className="flex min-w-0 flex-col gap-4">
              {safeToSpend}
              {accounts}
            </div>
            {map.budgets && <BudgetsCard budgets={map.budgets} today={today} />}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {map.forecast && <ForecastCard forecast={map.forecast} view={view} />}
            {map.moneyFlow && <MoneyFlowCard flow={map.moneyFlow} view={view} />}
          </div>
          <MoneyStoryCard currency={currency} />
        </>
      )}
    </>
  );
}

/** Si la API no responde, el Map sigue: el onboarding no bloquea a quien ya lo hizo. */
async function onboardingDone(): Promise<boolean> {
  try {
    return (await withAccessToken((token) => onboardingGateway().status(token))).completed;
  } catch (error) {
    unstable_rethrow(error);
    return true;
  }
}
