"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/button";
import { TextField } from "@/components/text-field";
import { cx } from "@/lib/cx";

import { featureLabel } from "../../billing/domain/plans";
import type { AdminFormState } from "../admin-actions";
import type { AdminFeature, AdminPlan, PricePeriod } from "../data/admin-gateway";

import { useMessages } from "@/lib/i18n/client";

type Action = (state: AdminFormState, form: FormData) => Promise<AdminFormState>;

function FormError({ code }: { code?: string }) {
  const t = useMessages().admin;
  if (!code) return null;
  return (
    <p role="alert" className="text-coral-text text-sm font-bold">
      {t.errors[code] ?? t.unknownError}
    </p>
  );
}

/** Nombre, descripción y visibilidad (spec 013 del back, RF-3). */
export function PlanDetailsForm({ plan, action }: { plan: AdminPlan; action: Action }) {
  const t = useMessages().admin;
  const [state, submit, pending] = useActionState(action, {});
  const free = plan.tier === 0;
  return (
    <form action={submit} className="flex flex-col gap-4" noValidate>
      <input type="hidden" name="code" value={plan.code} />
      <TextField label={t.name} name="name" defaultValue={plan.name} maxLength={60} required />
      <TextField
        label={t.description}
        name="description"
        defaultValue={plan.description ?? ""}
        maxLength={200}
      />
      <label className="flex items-center gap-3 text-sm font-semibold">
        <input
          type="checkbox"
          name="is_public"
          defaultChecked={plan.is_public}
          disabled={free}
          className="size-4 accent-[var(--mm-primary)]"
        />
        {t.isPublic}
      </label>
      {/* Un checkbox deshabilitado no viaja: el gratuito siempre va visible. */}
      {free && <input type="hidden" name="is_public" value="on" />}
      {free && <p className="text-muted text-xs">{t.freeAlwaysVisible}</p>}
      <FormError code={state.error} />
      <div>
        <Button type="submit" size="md" disabled={pending}>
          {pending ? t.saving : t.save}
        </Button>
      </div>
    </form>
  );
}

function PriceRow({
  plan,
  period,
  currency,
  action,
}: {
  plan: AdminPlan;
  period: PricePeriod;
  currency: string;
  action: Action;
}) {
  const t = useMessages().admin;
  const [state, submit, pending] = useActionState(action, {});
  const current = plan.prices.find((p) => p.period === period && p.currency === currency);
  return (
    <form action={submit} className="flex flex-wrap items-end gap-3" noValidate>
      <input type="hidden" name="code" value={plan.code} />
      <input type="hidden" name="period" value={period} />
      <input type="hidden" name="currency" value={currency} />
      <TextField
        className="min-w-[10rem] flex-1"
        label={`${period === "month" ? t.monthly : t.yearly} · ${t.amount(currency)}`}
        name="amount"
        inputMode="decimal"
        defaultValue={current ? current.amount.replace(".", ",") : ""}
      />
      <Button type="submit" size="md" variant="secondary" disabled={pending}>
        {pending ? t.saving : t.save}
      </Button>
      <div className="w-full">
        <FormError code={state.error} />
      </div>
    </form>
  );
}

/** El precio mensual y el anual en cada moneda del plan; el gratuito no tiene (RF-5). */
export function PlanPricesForm({ plan, action }: { plan: AdminPlan; action: Action }) {
  const t = useMessages().admin;
  if (plan.tier === 0) return <p className="text-muted text-sm">{t.freeNoPrice}</p>;
  const currencies = [...new Set(["BOB", ...plan.prices.map((p) => p.currency)])];
  return (
    <div className="flex flex-col gap-4">
      {currencies.flatMap((currency) =>
        (["month", "year"] as const).map((period) => (
          <PriceRow
            key={`${currency}-${period}`}
            plan={plan}
            period={period}
            currency={currency}
            action={action}
          />
        )),
      )}
    </div>
  );
}

function FeatureRow({
  plan,
  feature,
  action,
}: {
  plan: AdminPlan;
  feature: AdminFeature;
  action: Action;
}) {
  const i18n = useMessages();
  const t = i18n.admin;
  const [state, submit, pending] = useActionState(action, {});
  const [enabled, setEnabled] = useState(feature.enabled);
  const isLimit = feature.kind === "limit";
  return (
    <li className="border-line border-t py-3 first:border-t-0">
      <form
        action={submit}
        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_auto_9rem_auto]"
        noValidate
      >
        <input type="hidden" name="code" value={plan.code} />
        <input type="hidden" name="key" value={feature.key} />
        <span className="min-w-0">
          <b className="block text-sm">
            {featureLabel(feature.key, feature.description, i18n.plans.features)}
          </b>
          <span className="text-muted text-xs font-semibold">
            {!isLimit ? t.onOff : feature.period === "month" ? t.perMonthUse : t.perTotal}
          </span>
        </span>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input
            type="checkbox"
            name="enabled"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="size-4 accent-[var(--mm-primary)]"
          />
          {t.included}
        </label>
        {isLimit ? (
          <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
            <span className="sr-only">{t.limit}</span>
            <input
              name="limit"
              inputMode="numeric"
              defaultValue={feature.limit ?? ""}
              placeholder={t.limitHint}
              aria-label={`${t.limit} · ${t.limitHint}`}
              disabled={!enabled}
              className={cx(
                "focus-ring bg-field border-line h-10 rounded-[12px] border px-3 text-sm font-semibold tabular-nums",
                !enabled && "opacity-50",
              )}
            />
          </label>
        ) : (
          <span className="hidden sm:block" />
        )}
        <Button type="submit" size="md" variant="secondary" disabled={pending}>
          {pending ? t.saving : t.save}
        </Button>
        <div className="col-span-full">
          <FormError code={state.error} />
        </div>
      </form>
    </li>
  );
}

/** Qué funcionalidades tiene el plan y con qué límite (RF-4). */
export function PlanFeaturesForm({ plan, action }: { plan: AdminPlan; action: Action }) {
  const t = useMessages().admin;
  return (
    <div className="flex flex-col gap-3">
      <p className="bg-primary-soft text-primary-text rounded-[16px] px-4 py-3 text-sm font-semibold">
        {t.lowerNote(plan.subscribers)}
      </p>
      <ul>
        {plan.features.map((f) => (
          <FeatureRow key={f.key} plan={plan} feature={f} action={action} />
        ))}
      </ul>
    </div>
  );
}
