import { amountsHidden } from "@/lib/privacy";
import { randomUUID } from "node:crypto";

import Link from "next/link";
import { notFound, unstable_rethrow } from "next/navigation";

import { Button, ButtonLink } from "@/components/button";
import { GlassCard } from "@/components/glass-card";
import { Icon } from "@/components/icon";
import { Toast } from "@/components/toast";
import { mapGateway } from "@/features/map/data/map-gateway";
import { isoToday } from "@/features/map/domain/map";
import { byUse } from "@/features/quick-add/domain/categories";
import { PayForm } from "@/features/recurring/components/pay-form";
import { RecurringReceiptBox } from "@/features/recurring/components/recurring-receipt-box";
import { RuleForm } from "@/features/recurring/components/rule-form";
import { recurringGateway, type RecurringRule } from "@/features/recurring/data/recurring-gateway";
import { ruleOccurrences } from "@/features/recurring/domain/due";
import { createRule, removeRule, updateRule } from "@/features/recurring/recurring-actions";
import { transactionsGateway } from "@/features/transactions/data/transactions-gateway";
import { withAccessToken } from "@/lib/auth/session";
import { cx } from "@/lib/cx";
import { shortDate } from "@/lib/dates";
import { recurringErrorText } from "@/lib/i18n/recurring-messages";
import { CurrencyCatalog } from "@/lib/money/currency";
import { formatMoney } from "@/lib/money/money";

import type { Messages } from "@/lib/i18n/catalog";
import { getMessages, useServerMessages } from "@/lib/i18n/server";
const KINDS = ["income", "expenses"] as const;
type Kind = (typeof KINDS)[number];

const SAVED = (t: Messages["recurring"]): Record<string, string> => ({
  saved: t.saved,
  paid: t.paid,
  skipped: t.skipped,
  removed: t.removed,
});

/**
 * Ingresos y gastos fijos fuera del onboarding (spec 002 del back, RF-29 a
 * RF-31; spec 003, RF-17 y RF-20; MM-177): cada uno con su monto, cada cuánto
 * vence y el próximo vencimiento, por moneda y nunca sumados.
 */
export default async function RecurringPage({
  params,
  searchParams,
}: {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{
    new?: string;
    edit?: string;
    confirm?: string;
    saved?: string;
    error?: string;
  }>;
}) {
  const i18n = await getMessages();
  const t = i18n.recurring;
  const { kind: raw } = await params;
  const kind = KINDS.find((k) => k === raw);
  if (!kind) notFound();
  const query = await searchParams;

  let data: Awaited<ReturnType<typeof load>> | null = null;
  try {
    data = await load(kind);
  } catch (error) {
    unstable_rethrow(error);
  }

  const editing = data?.rules.find((r) => r.id === query.edit);
  const formOpen = Boolean(data && (query.new || editing));
  const saved = query.saved ? SAVED(t)[query.saved] : undefined;

  return (
    <>
      {saved && <Toast>{saved}</Toast>}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted text-[13px] font-semibold">{t.eyebrow}</p>
          <h1 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
            {t.title[kind]}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <nav aria-label={t.tabs} className="glass inline-flex gap-1 rounded-full p-1">
            {KINDS.map((k) => (
              <Link
                key={k}
                href={`/recurring/${k}`}
                aria-current={k === kind ? "page" : undefined}
                className={cx(
                  "focus-ring inline-flex h-9 items-center rounded-full px-4 text-sm font-bold",
                  k === kind
                    ? "bg-[rgb(21_25_54/0.9)] text-white dark:bg-white/90 dark:text-[#151936]"
                    : "text-ink-2",
                )}
              >
                {t.title[k]}
              </Link>
            ))}
          </nav>
          {data && data.accounts.length > 0 && (
            <ButtonLink href={`/recurring/${kind}?new=1`} size="md">
              <Icon name="plus" className="size-4" />
              {t.newRule[kind]}
            </ButtonLink>
          )}
        </div>
      </header>

      {query.error && (
        <p
          role="alert"
          className="bg-coral-soft text-coral-text rounded-2xl px-4 py-3 text-sm font-bold"
        >
          {recurringErrorText(query.error, i18n.locale)}
        </p>
      )}

      {!data ? (
        <GlassCard role="alert">
          <h2 className="text-lg font-extrabold">{t.error}</h2>
          <ButtonLink href={`/recurring/${kind}`} size="md" className="mt-4">
            {t.retry}
          </ButtonLink>
        </GlassCard>
      ) : data.accounts.length === 0 ? (
        <GlassCard>
          <p className="font-bold">{t.noAccounts}</p>
          <ButtonLink href="/accounts" size="md" className="mt-4">
            {t.addAccount}
          </ButtonLink>
        </GlassCard>
      ) : (
        <div
          className={cx(
            "grid items-start gap-4",
            formOpen && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]",
          )}
        >
          <RuleList kind={kind} data={data} confirm={query.confirm} />
          {formOpen && (
            <GlassCard aria-labelledby="rule-form-title">
              <h2 id="rule-form-title" className="mb-4 text-lg font-extrabold">
                {editing ? `${t.edit} · ${editing.description}` : t.newRule[kind]}
              </h2>
              <RuleForm
                key={editing?.id ?? "new"}
                action={editing ? updateRule : createRule}
                kind={kind}
                accounts={data.accounts}
                categories={data.categories}
                today={isoToday()}
                rule={editing}
              />
              {editing && editing.type === "expense" && (
                <div className="mt-4">
                  <RecurringReceiptBox rule={editing} kind={kind} />
                </div>
              )}
            </GlassCard>
          )}
        </div>
      )}
    </>
  );
}

function RuleList({
  kind,
  data,
  confirm,
}: {
  kind: Kind;
  data: NonNullable<Awaited<ReturnType<typeof load>>>;
  confirm?: string;
}) {
  const i18n = useServerMessages();
  const t = i18n.recurring;
  if (data.rules.length === 0) {
    return (
      <GlassCard data-testid="recurring-empty">
        <p className="font-bold">{t.empty[kind]}</p>
        <ButtonLink href={`/recurring/${kind}?new=1`} size="md" className="mt-4">
          {t.newRule[kind]}
        </ButtonLink>
      </GlassCard>
    );
  }
  const codes = data.catalog.order([...new Set(data.rules.map((r) => r.currency))]);
  return (
    <div className="flex min-w-0 flex-col gap-4">
      {codes.map((code) => (
        <section key={code} aria-label={code} className="flex flex-col gap-3">
          {codes.length > 1 && (
            <h2 className="text-muted px-1 text-xs font-bold">
              {data.catalog.get(code)?.name ?? code} · {code}
            </h2>
          )}
          {ruleOccurrences(data.rules.filter((r) => r.currency === code)).map(
            ({ rule, dueOn, after }) =>
              after ? (
                <LaterCard
                  key={`${rule.id}-${dueOn}`}
                  rule={rule}
                  dueOn={dueOn}
                  after={after}
                  kind={kind}
                  data={data}
                />
              ) : (
                <RuleCard
                  key={rule.id}
                  rule={rule}
                  kind={kind}
                  data={data}
                  confirm={confirm === rule.id}
                />
              ),
          )}
        </section>
      ))}
    </div>
  );
}

/** Otra vez por pagar de un fijo: se paga cuando se pague la anterior. */
function LaterCard({
  rule,
  dueOn,
  after,
  kind,
  data,
}: {
  rule: RecurringRule;
  dueOn: string;
  after: string;
  kind: Kind;
  data: NonNullable<Awaited<ReturnType<typeof load>>>;
}) {
  const i18n = useServerMessages();
  const t = i18n.recurring;
  const category = data.categories.find((c) => c.id === rule.category_id);
  const income = kind === "income";
  return (
    <GlassCard data-testid={`rule-${rule.id}-${dueOn}`}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-1.5 size-3 shrink-0 rounded-full"
          style={{ background: category?.color ?? "var(--mm-primary)" }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-extrabold">{rule.description}</h3>
          <p className="text-muted text-xs font-semibold">
            {[category?.name, t.frequency[rule.frequency] ?? rule.frequency]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-1 text-xs font-bold">
            <DueText dueOn={dueOn} next={false} />
          </p>
          <p className="text-muted mt-1 text-xs font-semibold">
            {t.paidAfter(shortDate(after, i18n.locale))}
          </p>
        </div>
        <p
          className={cx(
            "shrink-0 text-lg font-extrabold tabular-nums",
            income ? "text-green-text" : "text-coral-text",
          )}
        >
          {formatMoney(rule.amount, rule.currency, data.catalog, {
            hidden: data.hidden,
            sign: income ? "+" : "−",
          })}
        </p>
      </div>
    </GlassCard>
  );
}

/** "Vencido: 29 oct" en coral, "Vence hoy", o cuándo toca. `next`: es la próxima que se paga. */
function DueText({ dueOn, next }: { dueOn: string; next: boolean }) {
  const i18n = useServerMessages();
  const t = i18n.recurring;
  const today = isoToday();
  const date = shortDate(dueOn, i18n.locale);
  if (dueOn < today) return <span className="text-coral-text">{t.overdue(date)}</span>;
  if (dueOn === today) return <span className="text-ink-2">{t.dueToday}</span>;
  return <span className="text-ink-2">{next ? t.nextDue(date) : t.dueOn(date)}</span>;
}

function RuleCard({
  rule,
  kind,
  data,
  confirm,
}: {
  rule: RecurringRule;
  kind: Kind;
  data: NonNullable<Awaited<ReturnType<typeof load>>>;
  confirm: boolean;
}) {
  const i18n = useServerMessages();
  const t = i18n.recurring;
  const category = data.categories.find((c) => c.id === rule.category_id);
  const account = data.accounts.find((a) => a.id === rule.account_id);
  const income = kind === "income";
  return (
    <GlassCard data-testid={`rule-${rule.id}`}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="mt-1.5 size-3 shrink-0 rounded-full"
          style={{ background: category?.color ?? "var(--mm-primary)" }}
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-extrabold">{rule.description}</h3>
          <p className="text-muted text-xs font-semibold">
            {[category?.name, account?.name, t.frequency[rule.frequency] ?? rule.frequency]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <p className="mt-1 text-xs font-bold">
            <DueText dueOn={rule.next_due_on} next />
          </p>
        </div>
        <p
          className={cx(
            "shrink-0 text-lg font-extrabold tabular-nums",
            income ? "text-green-text" : "text-coral-text",
          )}
        >
          {formatMoney(rule.amount, rule.currency, data.catalog, {
            hidden: data.hidden,
            sign: income ? "+" : "−",
          })}
        </p>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <PayForm
          ruleId={rule.id}
          kind={kind}
          label={income ? t.markReceived : t.markPaid}
          accounts={data.accounts
            .filter((a) => a.currency === rule.currency)
            .map((a) => ({ id: a.id, name: a.name, balance: a.balance }))}
          defaultAccount={rule.account_id}
          idempotencyKey={randomUUID()}
        />
        <ButtonLink href={`/recurring/${kind}?edit=${rule.id}`} variant="ghost" size="md">
          {t.edit}
        </ButtonLink>
        <ButtonLink href={`/recurring/${kind}?confirm=${rule.id}`} variant="ghost" size="md">
          {t.remove}
        </ButtonLink>
      </div>
      {confirm && (
        <form
          action={removeRule}
          role="alertdialog"
          aria-labelledby={`remove-${rule.id}`}
          className="bg-coral-soft mt-3 rounded-[18px] p-4"
        >
          <input type="hidden" name="id" value={rule.id} />
          <input type="hidden" name="kind" value={kind} />
          <h4 id={`remove-${rule.id}`} className="font-extrabold">
            {t.removeTitle(rule.description)}
          </h4>
          <p className="mt-1 text-sm">{t.removeBody}</p>
          <div className="mt-3 flex justify-end gap-2">
            <Link
              href={`/recurring/${kind}`}
              className="focus-ring text-primary-text inline-flex h-11 items-center px-4 text-sm font-bold"
            >
              {t.cancel}
            </Link>
            <Button type="submit" variant="danger" size="md">
              {t.remove}
            </Button>
          </div>
        </form>
      )}
    </GlassCard>
  );
}

async function load(kind: Kind) {
  return withAccessToken(async (token) => {
    const map = mapGateway();
    const [rules, accounts, categories, currencies, preferences, recent] = await Promise.all([
      recurringGateway().rules(token),
      transactionsGateway().accounts(token),
      map.categories(token),
      map.currencies(token),
      map.preferences(token).catch(() => null),
      transactionsGateway()
        .list(token, { limit: 100 })
        .then((page) => page.items)
        .catch(() => []),
    ]);
    const hiddenAmounts = await amountsHidden(preferences);
    const catalog = new CurrencyCatalog(currencies);
    const type = kind === "income" ? "income" : "expense";
    return {
      catalog,
      hidden: hiddenAmounts,
      rules: rules.filter((r) => r.type === type),
      categories: byUse(
        categories.filter((c) => c.type === type),
        recent,
      ).map(({ id, name, type: t, color }) => ({ id, name, type: t, color })),
      accounts: accounts
        .filter((a) => !a.archived_at)
        .map((a) => ({
          id: a.id,
          name: a.name,
          currency: a.currency,
          label: catalog.labelOf(a.currency),
          decimals: catalog.decimalsOf(a.currency),
          isDefault: a.is_default,
          balance: formatMoney(a.current_balance, a.currency, catalog, {
            hidden: hiddenAmounts,
          }),
        })),
    };
  });
}
