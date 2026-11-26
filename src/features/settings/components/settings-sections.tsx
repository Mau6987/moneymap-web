import type { ReactNode } from "react";

import { ButtonLink } from "@/components/button";
import { GlassCard } from "@/components/glass-card";
import { Icon, type IconName } from "@/components/icon";
import type { PlanLimit } from "@/features/billing/plan-limits";

import { formatNumber } from "@/lib/money/money";

import type { Currency, MoneySettings, Preferences, Profile } from "../data/settings-gateway";
import {
  addCurrency,
  deleteAccount,
  removeCurrency,
  saveMainCurrency,
  saveLanguage,
  savePreferences,
  saveProfile,
  saveSavings,
} from "../settings-actions";
import { ACCENTS } from "../domain/accents";
import { AccentForm } from "./accent-form";
import { DeleteAccount } from "./delete-account";
import { MainCurrencyForm, MyCurrencies, SavingsForm } from "./money-forms";
import { ChoiceForm, SwitchForm } from "./preference-forms";
import { ProfileForm } from "./profile-form";

import { useServerMessages } from "@/lib/i18n/server";
import { languageChoices, type LanguageChoice } from "@/lib/i18n/locale";
/** Una fila de ajuste: ícono, nombre, detalle y su control a la derecha. */
function Row({
  id,
  icon,
  label,
  detail,
  children,
}: {
  id: string;
  icon: IconName;
  label: string;
  detail?: string;
  children: ReactNode;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3.5">
      <span
        aria-hidden="true"
        className="bg-primary-soft text-primary-text grid size-[38px] shrink-0 place-items-center rounded-[12px]"
      >
        <Icon name={icon} className="size-[18px]" />
      </span>
      <span className="min-w-[160px] flex-1">
        <span id={`${id}-label`} className="block text-[15px] font-bold">
          {label}
        </span>
        {detail && (
          <span id={`${id}-detail`} className="text-muted block text-xs">
            {detail}
          </span>
        )}
      </span>
      {children}
    </li>
  );
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return (
    <GlassCard>
      <h2 className="text-[15px] font-extrabold">{title}</h2>
      {children}
    </GlassCard>
  );
}

/** Los accesos del mockup: Monedas, Cuentas, Categorías y Avisos. */
function Shortcuts({ mine }: { mine: Currency[] }) {
  const i18n = useServerMessages();
  const t = i18n.settings;
  const s = t.shortcuts;
  const items: { href: string; icon: IconName; label: string; detail: string }[] = [
    {
      href: "#money",
      icon: "compass",
      label: s.currencies,
      detail: mine.map((c) => c.code).join(" · "),
    },
    { href: "/accounts", icon: "accounts", label: s.accounts, detail: s.accountsDetail },
    { href: "/categories", icon: "categories", label: s.categories, detail: s.categoriesDetail },
    {
      href: "/notifications/settings",
      icon: "bell",
      label: s.notifications,
      detail: s.notificationsDetail,
    },
  ];
  return (
    <ul className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
      {items.map((item) => (
        <li key={item.href}>
          <a
            href={item.href}
            className="glass focus-ring flex h-full flex-col gap-2 rounded-[22px] p-4"
          >
            <Icon name={item.icon} className="text-primary-text size-5" />
            <span className="text-[15px] font-extrabold">{item.label}</span>
            <span className="text-muted text-xs font-semibold">{item.detail}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export function ProfileSection({
  profile,
  preferences,
  money,
  currencies,
  language,
  currencyLimit = null,
}: {
  profile: Profile;
  preferences: Preferences;
  money: MoneySettings;
  currencies: Currency[];
  /** MM-188: Mis monedas al tope del plan; en lugar de "Sumar", el camino a Planes. */
  currencyLimit?: PlanLimit | null;
  /** RF-19: "system" o un idioma; vive en este navegador. */
  language: LanguageChoice;
}) {
  const i18n = useServerMessages();
  const t = i18n.settings;
  const p = t.preferences;
  const m = t.money;
  const mine = currencies.filter((c) => c.is_mine);
  const main = currencies.find((c) => c.code === money.main_currency);
  const decimals = main?.decimals ?? 2;
  return (
    <>
      <Shortcuts mine={mine} />
      <GlassCard>
        <ProfileForm profile={profile} action={saveProfile} />
      </GlassCard>
      <Card title={p.title}>
        <ul className="mt-2 flex flex-col divide-y divide-[var(--mm-line)]">
          <Row id="theme" icon="settings" label={p.theme} detail={p.themeDetail}>
            <ChoiceForm
              name="theme"
              label={p.theme}
              current={preferences.theme}
              action={savePreferences}
              options={["light", "dark", "system"].map((value) => ({
                value,
                label: p.themes[value] ?? value,
              }))}
            />
          </Row>
          <Row id="accent" icon="settings" label={p.accent} detail={p.accentDetail}>
            <AccentForm
              current={preferences.accent_color ?? ""}
              label={p.accent}
              options={ACCENTS.map((hex) => ({ hex, label: p.accentOption(hex) }))}
              action={savePreferences}
            />
          </Row>
          <Row
            id="language"
            icon="compass"
            label={p.language}
            detail={languageChoices().length > 1 ? p.languageDetail : p.languageOnly}
          >
            <ChoiceForm
              name="language"
              label={p.language}
              current={language}
              action={saveLanguage}
              options={languageChoices().map((value) => ({
                value,
                label: p.languages[value] ?? value,
              }))}
            />
          </Row>
          <Row id="week" icon="check" label={p.weekStart} detail={p.weekStartDetail}>
            <ChoiceForm
              name="week_starts_on"
              label={p.weekStart}
              current={String(preferences.week_starts_on)}
              action={savePreferences}
              options={[
                { value: "1", label: p.monday },
                { value: "0", label: p.sunday },
              ]}
            />
          </Row>
        </ul>
      </Card>
      <section id="money" aria-labelledby="money-title">
        <GlassCard className="flex flex-col gap-5">
          <h2 id="money-title" className="text-[15px] font-extrabold">
            {m.title}
          </h2>
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-bold">{m.main}</h3>
            <p className="text-muted text-xs">{m.mainDetail}</p>
            <MainCurrencyForm
              currencies={mine}
              main={money.main_currency}
              action={saveMainCurrency}
            />
          </div>
          <SavingsForm
            amount={formatNumber(money.planned_savings, decimals)}
            currency={money.main_currency}
            decimals={decimals}
            action={saveSavings}
          />
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-bold">{m.mine}</h3>
            <p className="text-muted text-xs">{m.mineDetail}</p>
            <MyCurrencies
              currencies={currencies}
              remove={removeCurrency}
              add={addCurrency}
              limit={currencyLimit}
            />
          </div>
        </GlassCard>
      </section>
    </>
  );
}

export function SecuritySection({ email, hidden }: { email: string; hidden: boolean }) {
  const i18n = useServerMessages();
  const t = i18n.settings;
  const s = t.security;
  return (
    <Card title={s.title}>
      <ul className="mt-2 flex flex-col divide-y divide-[var(--mm-line)]">
        <Row id="password" icon="lock" label={s.password} detail={s.passwordDetail}>
          <ButtonLink
            href={`/forgot-password?email=${encodeURIComponent(email)}`}
            variant="secondary"
            size="md"
          >
            {s.changePassword}
          </ButtonLink>
        </Row>
        <Row id="hide-amounts" icon="lock" label={s.hideAmounts} detail={s.hideAmountsDetail}>
          <SwitchForm
            name="hide_amounts"
            on={hidden}
            labelledBy="hide-amounts-label"
            describedBy="hide-amounts-detail"
            action={savePreferences}
            section="security"
          />
        </Row>
      </ul>
    </Card>
  );
}

export function NotificationsSection() {
  const i18n = useServerMessages();
  const t = i18n.settings;
  const n = t.notifications;
  return (
    <Card title={n.title}>
      <p className="text-muted mt-1 text-sm">{n.detail}</p>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <ButtonLink href="/notifications/settings" size="md">
          <Icon name="bell" className="size-[18px]" />
          {n.open}
        </ButtonLink>
        <ButtonLink href="/notifications" variant="secondary" size="md">
          {n.inbox}
        </ButtonLink>
      </div>
    </Card>
  );
}

export function DataSection() {
  const i18n = useServerMessages();
  const t = i18n.settings;
  const d = t.data;
  return (
    <Card title={d.title}>
      <ul className="mt-2 flex flex-col">
        <Row id="delete" icon="alert" label={d.deleteTitle} detail={d.deleteDetail}>
          <DeleteAccount action={deleteAccount} />
        </Row>
      </ul>
    </Card>
  );
}

export function HelpSection({ version }: { version: string }) {
  const i18n = useServerMessages();
  const t = i18n.settings;
  const h = t.help;
  return (
    <Card title={h.title}>
      <p className="text-muted mt-1 text-sm">{h.privacy}</p>
      <dl className="mt-4 flex justify-between text-sm">
        <dt className="font-bold">{h.version}</dt>
        <dd className="text-muted font-semibold">{version}</dd>
      </dl>
    </Card>
  );
}
