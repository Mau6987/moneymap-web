import { isoToday } from "@/features/map/domain/map";
import { redirect, unstable_rethrow } from "next/navigation";

import { ButtonLink } from "@/components/button";
import { GlassCard } from "@/components/glass-card";
import { AccountFields } from "@/features/onboarding/components/account-fields";
import {
  ExpenseFields,
  type ExpenseCategories,
} from "@/features/onboarding/components/expense-fields";
import {
  OnboardingShell,
  Option,
  StepHeading,
  type SummaryRow,
} from "@/features/onboarding/components/onboarding-shell";
import { ReadyStep } from "@/features/onboarding/components/ready-step";
import { StepForm } from "@/features/onboarding/components/step-form";
import {
  onboardingGateway,
  type Country,
  type Currency,
  type Institution,
  type OnboardingStatus,
} from "@/features/onboarding/data/onboarding-gateway";
import {
  INCOME_KINDS,
  canOpen,
  parseStep,
  resumeStep,
  type Step,
} from "@/features/onboarding/domain/steps";
import {
  chooseCountry,
  saveAccounts,
  saveCurrency,
  saveExpenses,
  saveIncome,
  savePeriod,
} from "@/features/onboarding/onboarding-actions";
import { currentProfile } from "@/features/auth/profile";
import { withAccessToken } from "@/lib/auth/session";

import { getMessages } from "@/lib/i18n/server";
import type { Messages } from "@/lib/i18n/catalog";
const DEFAULT_COUNTRY = "BO";

/**
 * El onboarding (spec 007, RF-1 a RF-12; mockup "Web-Onboarding"): un paso
 * por URL, guardado al continuar. Retoma donde quedó (RF-10) y, terminado,
 * manda al Map (RF-1).
 */
export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string; country?: string }>;
}) {
  const i18n = await getMessages();
  const t = i18n.onboarding;
  const params = await searchParams;

  let data: Awaited<ReturnType<typeof load>> | null = null;
  try {
    data = await load();
  } catch (error) {
    unstable_rethrow(error);
  }
  if (!data) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-lg items-center px-4">
        <GlassCard role="alert" className="w-full">
          <h1 className="text-lg font-extrabold">{t.error}</h1>
          <ButtonLink href="/onboarding" size="md" className="mt-4">
            {t.retry}
          </ButtonLink>
        </GlassCard>
      </main>
    );
  }

  const { status, countries, currencies, isAdmin } = data;
  const asked = parseStep(params.step);
  if (status.completed && asked !== "ready") redirect("/map");
  const step: Step = asked && canOpen(asked, status) ? asked : resumeStep(status);
  if (asked && asked !== step) redirect(`/onboarding?step=${step}`);

  const country =
    countries.find((c) => c.code === params.country?.toUpperCase()) ??
    countries.find((c) => c.currency === status.main_currency) ??
    countries.find((c) => c.code === DEFAULT_COUNTRY) ??
    countries[0];
  const currency = status.main_currency ?? country?.currency ?? "BOB";
  const decimals = currencies.find((c) => c.code === currency)?.decimals ?? 2;
  const query = (s: Step) => `/onboarding?step=${s}${country ? `&country=${country.code}` : ""}`;
  const hidden = { country: country?.code ?? "", currency, decimals: String(decimals) };

  return (
    // BUG-019: "Tu resumen" es para revisar el onboarding, no para el usuario
    // final (la app tampoco lo muestra); solo lo ve el administrador.
    <OnboardingShell
      step={step}
      summary={isAdmin ? summaryOf(status, country, currency, t) : undefined}
    >
      {step === "country" && (
        <form action={chooseCountry} className="flex flex-col gap-5">
          <StepHeading title={t.country.title} subtitle={t.country.subtitle} />
          <fieldset className="grid gap-2.5 md:grid-cols-2">
            <legend className="sr-only">{t.country.title}</legend>
            {countries.map((c) => (
              <Option
                key={c.code}
                name="country"
                value={c.code}
                checked={c.code === country?.code}
                label={c.name}
                detail={c.currency ?? undefined}
              />
            ))}
          </fieldset>
          <div className="flex justify-end">
            <button
              type="submit"
              className="bg-primary focus-ring h-11 rounded-full px-5 text-sm font-bold text-white"
            >
              {t.next}
            </button>
          </div>
        </form>
      )}
      {step === "currency" && (
        <StepForm
          action={saveCurrency}
          back={query("country")}
          hidden={{ country: hidden.country }}
        >
          <StepHeading title={t.currency.title} subtitle={t.currency.subtitle} />
          <fieldset className="grid gap-2.5 md:grid-cols-2">
            <legend className="sr-only">{t.currency.title}</legend>
            {sortedCurrencies(currencies, country?.currency).map((c) => (
              <Option
                key={c.code}
                name="currency"
                value={c.code}
                checked={c.code === currency}
                label={`${c.symbol} · ${c.code}`}
                detail={c.name}
                aside={
                  c.code === country?.currency ? (
                    <span className="bg-primary-soft text-primary-text rounded-full px-2.5 py-1 text-xs font-bold">
                      {t.currency.suggested}
                    </span>
                  ) : undefined
                }
              />
            ))}
          </fieldset>
        </StepForm>
      )}
      {step === "accounts" && (
        <StepForm action={saveAccounts} back={query("currency")} hidden={hidden}>
          <StepHeading title={t.accounts.title} subtitle={t.accounts.subtitle} />
          <AccountFields
            currency={currency}
            countryName={country?.name ?? ""}
            institutions={await institutionsOf(country?.code)}
          />
        </StepForm>
      )}
      {step === "period" && (
        <StepForm
          action={savePeriod}
          back={query("accounts")}
          hidden={hidden}
          extra={
            <button
              type="submit"
              name="skip"
              value="true"
              className="text-primary-text focus-ring h-11 rounded-full px-4 text-sm font-bold"
            >
              {t.period.skipAll}
            </button>
          }
        >
          <StepHeading title={t.period.title} subtitle={t.period.subtitle} />
          <fieldset className="grid gap-2.5 md:grid-cols-3">
            <legend className="sr-only">{t.period.title}</legend>
            {Object.entries(t.period.options).map(([value, [label, detail]]) => (
              <Option
                key={value}
                name="period"
                value={value}
                checked={value === "monthly"}
                label={label}
                detail={detail}
              />
            ))}
          </fieldset>
        </StepForm>
      )}
      {step === "income" && (
        <StepForm action={saveIncome} back={query("period")} hidden={hidden} canSkip>
          <StepHeading title={t.income.title} subtitle={t.income.subtitle} />
          <label className="flex flex-col gap-1.5">
            <span className="text-muted text-xs font-semibold">
              {t.income.amount} ({currency})
            </span>
            <input
              name="amount"
              inputMode="decimal"
              placeholder="0"
              className="bg-field border-line text-ink focus-ring h-[52px] rounded-2xl border-[1.5px] px-4 text-[15px] font-semibold"
            />
          </label>
          <fieldset className="grid gap-2.5 md:grid-cols-2">
            <legend className="text-muted mb-1.5 text-xs font-semibold">{t.income.kind}</legend>
            {INCOME_KINDS.map((kind) => (
              <Option
                key={kind}
                name="kind"
                value={kind}
                checked={kind === "salary"}
                label={t.income.kinds[kind] ?? kind}
              />
            ))}
          </fieldset>
        </StepForm>
      )}
      {step === "expenses" && (
        <StepForm
          action={saveExpenses}
          back={query("income")}
          hidden={hidden}
          canSkip
          submitLabel={t.expenses.finish}
        >
          <StepHeading title={t.expenses.title} subtitle={t.expenses.subtitle} />
          <ExpenseFields
            symbol={currencies.find((c) => c.code === currency)?.symbol ?? currency}
            decimals={decimals}
            today={isoToday()}
            categories={await expenseCategories()}
          />
        </StepForm>
      )}
      {step === "ready" && <ReadyStep currencies={currencies} status={status} />}
    </OnboardingShell>
  );
}

async function load() {
  return withAccessToken(async (token) => {
    const gateway = onboardingGateway();
    const [status, countries, currencies, profile] = await Promise.all([
      gateway.status(token),
      gateway.countries(token),
      gateway.currencies(token),
      currentProfile(),
    ]);
    return { status, countries, currencies, isAdmin: profile.is_admin === true };
  });
}

/** BUG-021: el color y el nombre de las categorías de los gastos de ejemplo, como la app. */
async function expenseCategories(): Promise<ExpenseCategories> {
  try {
    const categories = await withAccessToken((token) => onboardingGateway().categories(token));
    return Object.fromEntries(
      categories
        .filter((c) => c.type === "expense" && c.template_key)
        .map((c) => [c.template_key!, { name: c.name, color: c.color }]),
    );
  } catch (error) {
    unstable_rethrow(error);
    return {};
  }
}

/** El catálogo de bancos del país; sin él, la tarjeta se escribe a mano. */
async function institutionsOf(country?: string): Promise<Institution[]> {
  if (!country) return [];
  try {
    return await withAccessToken((token) => onboardingGateway().institutions(token, country));
  } catch (error) {
    unstable_rethrow(error);
    return [];
  }
}

/** La moneda sugerida del país primero; después el resto del catálogo. */
function sortedCurrencies(currencies: Currency[], suggested?: string | null): Currency[] {
  return [
    ...currencies.filter((c) => c.code === suggested),
    ...currencies.filter((c) => c.code !== suggested && c.is_active),
  ];
}

function summaryOf(
  status: OnboardingStatus,
  country: Country | undefined,
  currency: string,
  t: Messages["onboarding"],
): SummaryRow[] {
  const s = t.summary;
  const count = (n: number) => (n > 0 ? String(n) : s.none);
  return [
    { label: s.country, value: country?.name ?? s.none },
    { label: s.currency, value: status.main_currency ?? currency },
    { label: s.accounts, value: count(status.accounts) },
    { label: s.income, value: count(status.income_rules) },
    { label: s.expenses, value: count(status.expense_rules) },
  ];
}
