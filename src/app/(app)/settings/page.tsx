import Link from "next/link";
import { unstable_rethrow } from "next/navigation";

import { ButtonLink } from "@/components/button";
import { GlassCard } from "@/components/glass-card";
import { ThemeSync } from "@/components/theme-sync";
import { Toast } from "@/components/toast";
import {
  DataSection,
  HelpSection,
  NotificationsSection,
  ProfileSection,
  SecuritySection,
} from "@/features/settings/components/settings-sections";
import { settingsGateway } from "@/features/settings/data/settings-gateway";
import { asLimit, myPlanFeatures } from "@/features/billing/plan-limits";
import { withAccessToken } from "@/lib/auth/session";
import { cx } from "@/lib/cx";

import packageJson from "../../../../package.json";

import type { Messages } from "@/lib/i18n/catalog";
import { getLanguageChoice, getMessages } from "@/lib/i18n/server";
const SECTIONS = ["profile", "security", "notifications", "data", "help"] as const;
type Section = (typeof SECTIONS)[number];

const SAVED = (t: Messages["settings"]): Record<string, string> => ({
  profile: t.profile.saved,
  preferences: t.preferences.saved,
  money: t.money.saved,
  added: t.money.added,
  removed: t.money.removed,
});

/**
 * Ajustes (mockup "Web-Ajustes" y "Web-Seguridad"; spec 001 RF-10 a RF-17,
 * spec 002 RF-13 y RF-14): una sección a la vez, elegida en la lista de la
 * izquierda, igual que en la app. Fuera por ahora, sin API: la verificación en
 * dos pasos, cerrar otras sesiones, exportar e importar, y el idioma (MM-159). "Plan" abre Planes (MM-171).
 */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; saved?: string }>;
}) {
  const i18n = await getMessages();
  const t = i18n.settings;
  const language = await getLanguageChoice();
  const params = await searchParams;
  const section: Section = SECTIONS.find((s) => s === params.s) ?? "profile";

  let data: Awaited<ReturnType<typeof load>> | null = null;
  try {
    data = await load();
  } catch (error) {
    unstable_rethrow(error);
  }

  const saved = params.saved ? SAVED(t)[params.saved] : undefined;

  return (
    <>
      {saved && <Toast>{saved}</Toast>}
      <header>
        <p className="text-muted text-[13px] font-semibold">{t.eyebrow}</p>
        <h1 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
          {t.title}
        </h1>
      </header>
      {!data ? (
        <GlassCard role="alert">
          <h2 className="text-lg font-extrabold">{t.error}</h2>
          <ButtonLink href="/settings" size="md" className="mt-4">
            {t.retry}
          </ButtonLink>
        </GlassCard>
      ) : (
        <>
          <ThemeSync theme={data.preferences.theme} />
          <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-4 xl:grid-cols-[230px_minmax(0,1fr)]">
            <nav aria-label={t.sectionsLabel} className="glass rounded-[26px] p-2">
              <ul className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap xl:flex-col">
                {SECTIONS.map((s) => (
                  <li key={s}>
                    <Link
                      href={s === "profile" ? "/settings" : `/settings?s=${s}`}
                      aria-current={s === section ? "page" : undefined}
                      className={cx(
                        "focus-ring block rounded-[18px] px-4 py-2.5 text-sm font-bold",
                        s === section ? "bg-primary-soft text-primary-text" : "text-ink-2",
                      )}
                    >
                      {t.sections[s]}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link
                    href="/plans"
                    className="focus-ring text-ink-2 block rounded-[18px] px-4 py-2.5 text-sm font-bold"
                  >
                    {t.plan}
                  </Link>
                </li>
              </ul>
            </nav>
            <div className="flex min-w-0 flex-col gap-4">
              {section === "profile" && <ProfileSection {...data} language={language} />}
              {section === "security" && (
                <SecuritySection
                  email={data.profile.email}
                  hidden={data.preferences.hide_amounts}
                />
              )}
              {section === "notifications" && <NotificationsSection />}
              {section === "data" && <DataSection />}
              {section === "help" && <HelpSection version={packageJson.version} />}
            </div>
          </div>
        </>
      )}
    </>
  );
}

async function load() {
  const [data, features] = await Promise.all([
    withAccessToken(async (token) => {
      const gateway = settingsGateway();
      const [profile, preferences, money, currencies] = await Promise.all([
        gateway.profile(token),
        gateway.preferences(token),
        gateway.money(token),
        gateway.currencies(token),
      ]);
      return { profile, preferences, money, currencies };
    }),
    myPlanFeatures(),
  ]);
  // MM-188: Mis monedas sigue el límite de monedas del plan.
  const mine = data.currencies.filter((c) => c.is_mine).length;
  const own = features?.get("finance.currencies");
  const currencyLimit = own && own.limit !== null && mine >= own.limit ? asLimit(own, mine) : null;
  return { ...data, currencyLimit };
}
