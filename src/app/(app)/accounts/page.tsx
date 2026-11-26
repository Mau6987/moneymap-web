import { amountsHidden } from "@/lib/privacy";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { ButtonLink } from "@/components/button";
import { GlassCard } from "@/components/glass-card";
import { Toast } from "@/components/toast";
import { createAccount, renameAccount } from "@/features/accounts/accounts-actions";
import { NewAccountForm, RenameAccountForm } from "@/features/accounts/components/account-forms";
import { asLimit, isFull, myPlanFeatures } from "@/features/billing/plan-limits";
import { mapGateway } from "@/features/map/data/map-gateway";
import { transactionsGateway } from "@/features/transactions/data/transactions-gateway";
import { withAccessToken } from "@/lib/auth/session";

import { CurrencyCatalog } from "@/lib/money/currency";
import { formatMoney } from "@/lib/money/money";

import { getMessages } from "@/lib/i18n/server";
/**
 * Cuentas (spec 002, RF-1 a RF-3, RF-15 y RF-17; mockup "Web-Cuentas"): las
 * cuentas por moneda, cada una con el total que da la API para esa moneda,
 * nunca uno que sume monedas. Al costado, "Nueva cuenta".
 */
export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ rename?: string; saved?: string }>;
}) {
  const i18n = await getMessages();
  const t = i18n.accounts;
  const { rename, saved } = await searchParams;
  let data: Awaited<ReturnType<typeof load>> | null = null;
  try {
    data = await load();
  } catch (error) {
    unstable_rethrow(error);
  }

  return (
    <>
      {saved === "created" && <Toast>{t.created}</Toast>}
      {saved === "renamed" && <Toast>{t.renamed}</Toast>}
      <header>
        {data && <p className="text-muted text-[13px] font-semibold">{t.count(data.count)}</p>}
        <h1 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
          {t.title}
        </h1>
      </header>
      {!data ? (
        <GlassCard role="alert">
          <h2 className="text-lg font-extrabold">{t.error}</h2>
          <ButtonLink href="/accounts" size="md" className="mt-4">
            {t.retry}
          </ButtonLink>
        </GlassCard>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[1fr_360px]">
          <div className="flex flex-col gap-4">
            {data.groups.length === 0 && (
              <GlassCard>
                <p className="text-muted text-sm">{t.empty}</p>
              </GlassCard>
            )}
            {data.groups.map((group) => {
              const money = (amount: string) =>
                formatMoney(amount, group.code, data.catalog, { hidden: data.hidden });
              return (
                <GlassCard key={group.code} aria-labelledby={`accounts-${group.code}`}>
                  <h2 id={`accounts-${group.code}`} className="text-muted text-xs font-bold">
                    {group.code} · {group.name}
                    {group.isMain ? ` · ${t.main.toLowerCase()}` : ""}
                  </h2>
                  {group.balance && (
                    <dl className="mt-2 grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <dt className="text-muted text-xs font-semibold">{t.total}</dt>
                        <dd className="text-xl font-extrabold tabular-nums">
                          {money(group.balance.total)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted text-xs font-semibold">{t.cash}</dt>
                        <dd className="font-extrabold tabular-nums">
                          {money(group.balance.cash_total)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-muted text-xs font-semibold">{t.cards}</dt>
                        <dd className="font-extrabold tabular-nums">
                          {money(group.balance.card_total)}
                        </dd>
                      </div>
                    </dl>
                  )}
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                    {group.accounts.map((a) => (
                      <li
                        key={a.id}
                        className="bg-well rounded-[18px] p-3.5"
                        data-testid={`account-${a.id}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <b className="block truncate">{a.name}</b>
                            <span className="text-muted text-xs font-semibold">
                              {a.type === "card" ? t.typeCard : t.typeCash}
                              {a.is_default ? ` · ${t.default}` : ""}
                            </span>
                          </div>
                          <Link
                            href={`/accounts?rename=${a.id}`}
                            className="focus-ring text-primary-text shrink-0 text-xs font-bold"
                            aria-label={t.renameTitle(a.name)}
                          >
                            {t.rename}
                          </Link>
                        </div>
                        <p className="mt-2 text-lg font-extrabold tabular-nums">
                          {money(a.current_balance)}
                        </p>
                        {rename === a.id && (
                          <RenameAccountForm
                            action={renameAccount}
                            id={a.id}
                            currentName={a.name}
                          />
                        )}
                      </li>
                    ))}
                  </ul>
                </GlassCard>
              );
            })}
          </div>
          <GlassCard>
            <NewAccountForm action={createAccount} currencies={data.options} limits={data.limits} />
          </GlassCard>
        </div>
      )}
    </>
  );
}

async function load() {
  return withAccessToken(async (token) => {
    const [accounts, balances, currencies, preferences] = await Promise.all([
      transactionsGateway().accounts(token),
      mapGateway().balances(token),
      mapGateway().currencies(token),
      mapGateway()
        .preferences(token)
        .catch(() => null),
    ]);
    const hiddenAmounts = await amountsHidden(preferences);
    const catalog = new CurrencyCatalog(currencies);
    const active = accounts.filter((a) => !a.archived_at);
    const groups = catalog.order(new Set(active.map((a) => a.currency))).map((code) => ({
      code,
      name: catalog.get(code)?.name ?? code,
      isMain: catalog.main?.code === code,
      balance: balances.find((b) => b.currency === code),
      accounts: active.filter((a) => a.currency === code),
    }));
    const options = catalog
      .order(currencies.filter((c) => c.is_active).map((c) => c.code))
      .map((code) => ({
        code,
        name: catalog.get(code)?.name ?? code,
        decimals: catalog.decimalsOf(code),
      }));
    // MM-188: tarjetas y monedas nuevas siguen el plan.
    const features = await myPlanFeatures();
    const cards = features?.get("finance.cards");
    const ownCurrencies = features?.get("finance.currencies");
    const limits = {
      cards: cards && isFull(cards) ? asLimit(cards) : null,
      currencies: ownCurrencies && isFull(ownCurrencies) ? asLimit(ownCurrencies) : null,
      withAccounts: [...new Set(active.map((a) => a.currency))],
    };
    return {
      catalog,
      groups,
      options,
      limits,
      count: active.length,
      hidden: hiddenAmounts,
    };
  });
}
