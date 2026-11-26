import { unstable_rethrow } from "next/navigation";

import { ButtonLink } from "@/components/button";
import { GlassCard } from "@/components/glass-card";
import { Icon } from "@/components/icon";
import { Toast } from "@/components/toast";
import { NoticeSwitch } from "@/features/notifications/components/notice-forms";
import { notificationsGateway } from "@/features/notifications/data/notifications-gateway";
import { noticeDomId, noticeIcon } from "@/features/notifications/domain/notices";
import { toggleNotice } from "@/features/notifications/notifications-actions";
import { withAccessToken } from "@/lib/auth/session";

import { getMessages } from "@/lib/i18n/server";
/**
 * Notificaciones (spec 006, RF-11 y RF-12; mockup "Notificaciones"): un
 * interruptor por tipo de aviso. Los de seguridad y cobro siempre llegan. Un
 * tipo nuevo muestra la descripción de la API como nombre.
 */
export default async function NotificationSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const i18n = await getMessages();
  const t = i18n.notifications;
  const { saved } = await searchParams;

  let settings: Awaited<ReturnType<typeof load>> | null = null;
  try {
    settings = await load();
  } catch (error) {
    unstable_rethrow(error);
  }

  return (
    <>
      {saved && <Toast>{t.saved}</Toast>}
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-muted text-[13px] font-semibold">{t.title}</p>
          <h1 className="mt-0.5 text-[30px] font-extrabold tracking-[-0.03em] max-md:text-2xl">
            {t.settingsTitle}
          </h1>
        </div>
        <ButtonLink href="/notifications" variant="secondary" size="md">
          <Icon name="back" className="size-4" />
          {t.back}
        </ButtonLink>
      </header>
      {!settings ? (
        <GlassCard role="alert">
          <h2 className="text-lg font-extrabold">{t.error}</h2>
          <ButtonLink href="/notifications/settings" size="md" className="mt-4">
            {t.retry}
          </ButtonLink>
        </GlassCard>
      ) : (
        <GlassCard className="max-w-2xl">
          <p className="text-muted text-sm">{t.settingsNote}</p>
          <ul className="mt-2 flex flex-col divide-y divide-[var(--mm-line)]">
            {settings.map((setting) => {
              const id = noticeDomId(setting.type);
              const name = t.names[setting.type];
              const detail = [
                ...(name ? [setting.description] : []),
                ...(setting.can_disable ? [] : [t.alwaysOn]),
              ].join(" · ");
              return (
                <li key={setting.type} className="flex items-center gap-3 py-3.5">
                  <span
                    aria-hidden="true"
                    className="bg-primary-soft text-primary-text grid size-[38px] shrink-0 place-items-center rounded-[12px]"
                  >
                    <Icon name={noticeIcon(setting.type)} className="size-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span id={`${id}-name`} className="block text-[15px] font-bold">
                      {name ?? setting.description}
                    </span>
                    <span id={`${id}-description`} className="text-muted block text-xs">
                      {detail}
                    </span>
                  </span>
                  <NoticeSwitch setting={setting} action={toggleNotice} />
                </li>
              );
            })}
          </ul>
        </GlassCard>
      )}
    </>
  );
}

async function load() {
  return withAccessToken((token) => notificationsGateway().settings(token));
}
